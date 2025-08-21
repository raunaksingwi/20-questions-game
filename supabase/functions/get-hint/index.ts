/**
 * Edge function that generates contextual hints for the 20 Questions game.
 * Analyzes conversation history to provide helpful hints without revealing the answer.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'
import { ResponseParser } from '../_shared/llm/index.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DEFAULT_GAME_LIMITS } from '../_shared/common/GameConfig.ts'
import { SEARCH_FUNCTION, FunctionHandler } from '../_shared/llm/functions.ts'
import { ConversationState } from '../_shared/state/ConversationState.ts'

// Initialize shared services
const supabase = EdgeFunctionBase.initialize()

/**
 * Handles hint generation requests by analyzing conversation context.
 * Provides progressive hints that avoid repeating known information.
 */
const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { game_id }: GetHintRequest = await req.json()

    // Get game and messages in a single query for better performance
    const { data, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        game_messages (
          id, role, content, message_type, question_number, created_at
        )
      `)
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!data) throw new Error('Game not found')
    if (data.status !== 'active') throw new Error('Game is not active')
    
    const game = data
    const messages = (data.game_messages || []).sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Check hint limit
    if (game.hints_used >= DEFAULT_GAME_LIMITS.hintsPerGame) {
      throw new Error(`You've already used all ${DEFAULT_GAME_LIMITS.hintsPerGame} hints!`)
    }

    // Prepare hint request with full conversation context
    const chatMessages = messages.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))

    // Extract structured facts from conversation to avoid repeating known information
    const previousHints = messages.filter((m: any) => m.role === 'assistant' && m.message_type === 'hint')
    const facts = ConversationState.extractFacts(messages as any)
    
    // Build comprehensive summary of known information  
    let conversationSummary = `[HINT GENERATION CONTEXT:
- Game Progress: ${game.questions_asked}/20 questions, ${game.hints_used}/3 hints used
- Current Stage: Question #${game.questions_asked + 1}
- Category: ${game.category || 'General'}
- Secret Item: ${game.secret_item}

ESTABLISHED FACTS - COMPLETELY AVOID REPEATING THIS KNOWN INFORMATION:`

    // List all confirmed YES facts (what the item IS)
    if (facts.confirmed_yes.length > 0) {
      conversationSummary += `\n\nCONFIRMED TRUE (Player knows the item IS these things):`
      facts.confirmed_yes.forEach(fact => {
        conversationSummary += `\n  ✓ ${fact.question} (Player already knows this - confidence: ${Math.round(fact.confidence * 100)}%)`
      })
    }

    // List all confirmed NO facts (what the item IS NOT)
    if (facts.confirmed_no.length > 0) {
      conversationSummary += `\n\nCONFIRMED FALSE (Player knows the item is NOT these things):`
      facts.confirmed_no.forEach(fact => {
        conversationSummary += `\n  ✗ ${fact.question} (Player already knows this - confidence: ${Math.round(fact.confidence * 100)}%)`
      })
    }

    // List uncertain/partial knowledge
    if (facts.uncertain.length > 0) {
      conversationSummary += `\n\nPARTIAL/UNCERTAIN KNOWLEDGE:`
      facts.uncertain.forEach(fact => {
        conversationSummary += `\n  ? ${fact.question} → ${fact.answer} (Player has partial knowledge)`
      })
    }

    // List previous hints to avoid repetition
    if (previousHints.length > 0) {
      conversationSummary += `\n\nPREVIOUS HINTS ALREADY GIVEN (DO NOT REPEAT):`
      previousHints.forEach((hint: any, index: number) => {
        conversationSummary += `\n  Hint #${index + 1}: "${hint.content}"`
      })
    }

    conversationSummary += `\n\n🚨 CRITICAL INSTRUCTION: 
- MUST provide completely NEW information not in established facts above
- MUST avoid repeating any previous hints or known facts
- MUST focus on unexplored aspects of the secret item
- MUST guide player toward better strategic questions
- MUST maintain consistency with all confirmed facts]`

    // Add conversation summary
    chatMessages.push({
      role: 'system',
      content: conversationSummary
    })

    // Generate a hint that focuses on unexplored information
    const gameStage = game.questions_asked < 5 ? 'early' : game.questions_asked < 10 ? 'mid' : game.questions_asked < 15 ? 'late' : 'very_late'
    const stageGuidance = {
      early: 'Give a distinctive characteristic or property hint',
      mid: 'Give context, environment, or usage hint', 
      late: 'Give specific functional or role-based hint',
      very_late: 'Give narrowing hint focusing on most distinctive feature'
    }[gameStage]
    
    const hintPrompt = `Generate hint #${game.hints_used + 1} for secret item: "${game.secret_item}"

STAGE STRATEGY (${gameStage} game): ${stageGuidance}

CRITICAL REQUIREMENTS:
1. NEW INFORMATION: Must provide completely new information not in established facts
2. CONSISTENCY: Stay consistent with all confirmed facts and previous answers
3. SUBTLETY: Don't reveal answer directly - use indirect descriptive language
4. ACTIONABILITY: Guide player toward better questions for unexplored aspects
5. STAGE-APPROPRIATE: ${gameStage === 'early' ? 'Broad distinctive features' : gameStage === 'mid' ? 'Contextual associations' : gameStage === 'late' ? 'Specific characteristics' : 'Focused narrowing clues'}

QUALITY CHECKLIST:
✓ Addresses unexplored aspect (novelty)
✓ Helps guide next questions (actionability)  
✓ Matches confirmed facts (consistency)
✓ Appropriate disclosure level (${Math.round(((game.questions_asked / 20) + (game.hints_used / 3)) * 100)}% game progress)

Respond with ONLY the hint text - no explanations:`

    chatMessages.push({
      role: 'user',
      content: hintPrompt
    })

    // Get LLM provider (lazy initialization with caching)
    const provider = EdgeFunctionBase.getLLMProvider('get-hint')

    // Call LLM provider with search function available for hint generation
    let llmResponse = await provider.generateResponse({
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 150, // Allow some tokens for function calls
      functions: [SEARCH_FUNCTION],
      function_call: 'auto'
    })

    // Handle function calls for hints
    if (llmResponse.function_call) {
      const functionResult = await FunctionHandler.executeFunction(
        llmResponse.function_call.name,
        llmResponse.function_call.arguments
      )
      
      // Add function result to messages and call LLM again
      chatMessages.push({
        role: 'assistant',
        content: `[SEARCH FUNCTION CALLED: ${llmResponse.function_call.name}]`
      })
      
      chatMessages.push({
        role: 'user', 
        content: `Search Results: ${functionResult}\n\nUsing these search results and respecting established facts, generate hint #${game.hints_used + 1} for "${game.secret_item}".\n\nREQUIREMENTS:\n- NEW INFO ONLY: Avoid all established facts and previous hints\n- ACTIONABLE: Guide toward strategic unexplored questions\n- CONSISTENT: Align with confirmed facts\n- STAGE-APPROPRIATE: ${gameStage} game hint strategy\n\nProvide ONLY the hint text:`
      })
      
      // Call LLM again with search results
      llmResponse = await provider.generateResponse({
        messages: chatMessages,
        temperature: 0.7,
        maxTokens: 100
      })
    }

    const rawHint = llmResponse.content

    // Parse hint response
    const hint = ResponseParser.parseHintResponse(rawHint)

    // Save hint message and update game in parallel for better performance
    const questionNumber = game.questions_asked + 1
    const newQuestionsAsked = game.questions_asked + 1
    
    const [insertResult, updateResult] = await Promise.all([
      supabase
        .from('game_messages')
        .insert([
          {
            game_id: game_id,
            role: 'user',
            content: 'I need a hint!',
            message_type: 'hint',
            question_number: questionNumber
          },
          {
            game_id: game_id,
            role: 'assistant',
            content: hint,
            message_type: 'hint',
            question_number: questionNumber
          }
        ]),
      supabase
        .from('games')
        .update({ 
          hints_used: game.hints_used + 1,
          questions_asked: newQuestionsAsked,
          updated_at: new Date().toISOString()
        })
        .eq('id', game_id)
    ])

    if (insertResult.error) throw insertResult.error
    if (updateResult.error) throw updateResult.error

    // Check if game should end due to no more questions
    const gameStatus = newQuestionsAsked >= DEFAULT_GAME_LIMITS.questionsPerGame ? 'lost' : 'active'
    if (gameStatus === 'lost') {
      await supabase
        .from('games')
        .update({ status: 'lost' })
        .eq('id', game_id)
      
      // Game cleanup is now handled by database triggers
    }

    const responseData: GetHintResponse = {
      hint: gameStatus === 'lost' ? `${hint} Game over! You've used all ${DEFAULT_GAME_LIMITS.questionsPerGame} questions. The answer was "${game.secret_item}".` : hint,
      hints_remaining: DEFAULT_GAME_LIMITS.hintsPerGame - game.hints_used - 1,
      questions_remaining: DEFAULT_GAME_LIMITS.questionsPerGame - newQuestionsAsked,
      game_status: gameStatus
    }

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)