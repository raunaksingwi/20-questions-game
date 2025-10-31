/**
 * Edge function that retrieves comprehensive player statistics and performance analytics.
 * Analyzes historical game data to provide insights into playing style and patterns.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  GetPlayerStatsRequest,
  GetPlayerStatsResponse,
  PlayerStats,
  CategoryStats,
  GameSummary,
  GameMessage
} from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'

// Initialize shared services
const supabase = EdgeFunctionBase.initialize()

/**
 * Calculates comprehensive statistics for a player across all their games.
 * Provides category breakdowns, performance metrics, and playing style insights.
 */
const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const {
      user_id,
      recent_games_limit = 10,
      search_term
    }: GetPlayerStatsRequest = await req.json()

    if (!user_id || typeof user_id !== 'string') {
      throw new Error('Valid user_id is required')
    }

    // ========================================================================
    // PERFORMANCE ISSUE #1: N+1 Query Problem
    // We fetch games first, then fetch messages for each game separately
    // This creates 1 + N queries instead of a single JOIN query
    // ========================================================================

    // First, fetch all user's games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, user_id, secret_item, category, mode, questions_asked, hints_used, status, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (gamesError) throw gamesError
    if (!games || games.length === 0) {
      // Return empty stats for users with no games
      return new Response(
        JSON.stringify({
          stats: {
            total_games: 0,
            total_wins: 0,
            total_losses: 0,
            overall_win_rate: 0,
            avg_questions_per_game: 0,
            avg_hints_per_game: 0,
            category_breakdown: [],
            recent_games: [],
            favorite_category: 'None'
          }
        } as GetPlayerStatsResponse),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Now fetch messages for EACH game individually (N+1 problem!)
    const gamesWithMessages: Array<{
      game: typeof games[0],
      messages: GameMessage[]
    }> = []

    for (const game of games) {
      // This loop creates N additional queries!
      const { data: messages, error: messagesError } = await supabase
        .from('game_messages')
        .select('id, game_id, role, content, message_type, question_number, created_at')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error(`Error fetching messages for game ${game.id}:`, messagesError)
        continue
      }

      gamesWithMessages.push({
        game,
        messages: messages || []
      })
    }

    // Calculate basic statistics
    const totalGames = games.length
    const wonGames = games.filter(g => g.status === 'won')
    const lostGames = games.filter(g => g.status === 'lost')
    const totalWins = wonGames.length
    const totalLosses = lostGames.length
    const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0

    // ========================================================================
    // PERFORMANCE ISSUE #3: Client-Side Aggregation Instead of Database
    // We transfer ALL message data and aggregate in JavaScript
    // Should use SQL GROUP BY and aggregate functions in database
    // ========================================================================

    // Calculate average questions and hints (inefficient in-memory calculation)
    let totalQuestionsAsked = 0
    let totalHintsUsed = 0

    for (const game of games) {
      totalQuestionsAsked += game.questions_asked
      totalHintsUsed += game.hints_used
    }

    const avgQuestionsPerGame = totalGames > 0 ? totalQuestionsAsked / totalGames : 0
    const avgHintsPerGame = totalGames > 0 ? totalHintsUsed / totalGames : 0

    // Build category statistics (also inefficient - should be in database)
    const categoryMap = new Map<string, {
      games: typeof games,
      totalQuestions: number,
      totalHints: number
    }>()

    for (const game of games) {
      if (!categoryMap.has(game.category)) {
        categoryMap.set(game.category, {
          games: [],
          totalQuestions: 0,
          totalHints: 0
        })
      }

      const categoryData = categoryMap.get(game.category)!
      categoryData.games.push(game)
      categoryData.totalQuestions += game.questions_asked
      categoryData.totalHints += game.hints_used
    }

    // Convert category map to CategoryStats array
    const categoryBreakdown: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => {
      const gamesPlayed = data.games.length
      const gamesWon = data.games.filter(g => g.status === 'won').length
      const gamesLost = data.games.filter(g => g.status === 'lost').length
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0
      const avgQuestionsUsed = gamesPlayed > 0 ? data.totalQuestions / gamesPlayed : 0
      const avgHintsUsed = gamesPlayed > 0 ? data.totalHints / gamesPlayed : 0

      return {
        category,
        games_played: gamesPlayed,
        games_won: gamesWon,
        games_lost: gamesLost,
        win_rate: Math.round(winRate * 10) / 10,
        avg_questions_used: Math.round(avgQuestionsUsed * 10) / 10,
        avg_hints_used: Math.round(avgHintsUsed * 10) / 10
      }
    })

    // Sort by games played (descending)
    categoryBreakdown.sort((a, b) => b.games_played - a.games_played)

    // Determine favorite category
    const favoriteCategory = categoryBreakdown.length > 0
      ? categoryBreakdown[0].category
      : 'None'

    // Build recent games summaries with message counts
    const recentGamesData = gamesWithMessages.slice(0, recent_games_limit)
    const recentGames: GameSummary[] = recentGamesData.map(({ game, messages }) => {
      // Find first user interaction (question or answer)
      const firstUserMessage = messages.find(m => m.role === 'user')

      return {
        id: game.id,
        category: game.category,
        mode: game.mode,
        status: game.status,
        secret_item: game.secret_item,
        questions_asked: game.questions_asked,
        hints_used: game.hints_used,
        created_at: game.created_at,
        message_count: messages.length,
        first_interaction: firstUserMessage?.content.substring(0, 100)
      }
    })

    // ========================================================================
    // PERFORMANCE ISSUE #2: Unindexed Text Search with ILIKE
    // If search_term is provided, we do a full table scan
    // No GIN index exists for text search on message content
    // ========================================================================

    let similarGamesInsight: string | undefined = undefined

    if (search_term && search_term.trim().length > 0) {
      // This ILIKE query will cause a full table scan in production!
      const { data: similarMessages, error: searchError } = await supabase
        .from('game_messages')
        .select('game_id, content, games!inner(category, secret_item)')
        .eq('games.user_id', user_id)
        .ilike('content', `%${search_term}%`)  // SLOW! No text search index
        .limit(50)

      if (!searchError && similarMessages && similarMessages.length > 0) {
        // Process search results to find patterns
        const gameIds = new Set(similarMessages.map((m: any) => m.game_id))
        const matchingGames = games.filter(g => gameIds.has(g.id))
        const matchingCategories = [...new Set(matchingGames.map(g => g.category))]

        similarGamesInsight = `Found ${similarMessages.length} messages matching "${search_term}" across ${gameIds.size} games in categories: ${matchingCategories.join(', ')}`
      }
    }

    // Generate AI-powered playing style insight (optional enhancement)
    let playingStyleInsight: string | undefined = undefined

    if (totalGames >= 3) {
      // Analyze playing patterns
      const avgQuestionsRounded = Math.round(avgQuestionsPerGame)
      const avgHintsRounded = Math.round(avgHintsPerGame * 10) / 10

      if (overallWinRate >= 70) {
        playingStyleInsight = `Excellent player! You win ${Math.round(overallWinRate)}% of games using an average of ${avgQuestionsRounded} questions. `
      } else if (overallWinRate >= 50) {
        playingStyleInsight = `Solid performance with a ${Math.round(overallWinRate)}% win rate. You typically use ${avgQuestionsRounded} questions per game. `
      } else {
        playingStyleInsight = `You're learning! Current win rate is ${Math.round(overallWinRate)}%. Try asking more strategic questions to improve. `
      }

      if (avgHintsRounded > 1) {
        playingStyleInsight += `You rely heavily on hints (${avgHintsRounded} per game). Try making bolder guesses!`
      } else if (avgHintsRounded < 0.5) {
        playingStyleInsight += `You rarely use hints - confident and strategic!`
      }

      if (favoriteCategory !== 'None') {
        playingStyleInsight += ` Your favorite category is ${favoriteCategory}.`
      }
    }

    // Combine similar games insight if available
    if (similarGamesInsight) {
      playingStyleInsight = playingStyleInsight
        ? `${playingStyleInsight} ${similarGamesInsight}`
        : similarGamesInsight
    }

    // Build final response
    const stats: PlayerStats = {
      total_games: totalGames,
      total_wins: totalWins,
      total_losses: totalLosses,
      overall_win_rate: Math.round(overallWinRate * 10) / 10,
      avg_questions_per_game: Math.round(avgQuestionsPerGame * 10) / 10,
      avg_hints_per_game: Math.round(avgHintsPerGame * 10) / 10,
      category_breakdown: categoryBreakdown,
      recent_games: recentGames,
      favorite_category: favoriteCategory,
      playing_style_insight: playingStyleInsight
    }

    return new Response(
      JSON.stringify({ stats } as GetPlayerStatsResponse),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-player-stats:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

serve(handler)
