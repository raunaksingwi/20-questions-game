import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'
import { ResponseParser } from '../_shared/llm/index.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DEFAULT_GAME_LIMITS } from '../_shared/common/GameConfig.ts'
import { SEARCH_FUNCTION, FunctionHandler } from '../_shared/llm/functions.ts'

// Initialize shared services
const supabase = EdgeFunctionBase.initialize()

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

    // Extract and summarize key information from conversation
    const userQuestions = messages.filter((m: any) => m.role === 'user' && m.message_type === 'question')
    const previousHints = messages.filter((m: any) => m.role === 'assistant' && m.message_type === 'hint')
    const answers = messages.filter((m: any) => m.role === 'assistant' && m.message_type === 'answer')
    
    // Build conversation summary
    let conversationSummary = `[HINT CONTEXT SUMMARY:
- Total questions asked: ${userQuestions.length}
- Previous hints given: ${previousHints.length}
- Current progress: Question #${game.questions_asked + 1} of 20

PREVIOUS HINTS PROVIDED:`

    if (previousHints.length > 0) {
      previousHints.forEach((hint: any, index: number) => {
        conversationSummary += `\nHint #${index + 1}: "${hint.content}"`
      })
    } else {
      conversationSummary += `\nNo previous hints given.`
    }

    conversationSummary += `\n\nKEY ANSWERS FROM CONVERSATION:`
    
    // Summarize Yes/No pattern to help generate consistent hints
    const yesAnswers = answers.filter((a: any) => a.content.toLowerCase().includes('yes')).length
    const noAnswers = answers.filter((a: any) => a.content.toLowerCase().includes('no')).length
    conversationSummary += `\n- "Yes" answers: ${yesAnswers}, "No" answers: ${noAnswers}`
    conversationSummary += `\n\nThe conversation above shows what the player already knows about the secret item.]`

    // Add conversation summary
    chatMessages.push({
      role: 'system',
      content: conversationSummary
    })

    // Add hint request with enhanced context
    const hintPrompt = `Based on our conversation so far about the secret item (${game.secret_item}), provide hint #${game.hints_used + 1}:

CRITICAL REQUIREMENTS:
1. MUST be consistent with ALL previous answers - review the entire conversation
2. MUST NOT contradict any previous hints: ${previousHints.map((h: any) => `"${h.content}"`).join(', ') || 'none'}
3. MUST NOT repeat previous hints - provide NEW information each time
4. Should build upon what the player already knows
5. Don't reveal the answer directly
6. Consider what questions haven't been asked yet

HINT PROGRESSION GUIDELINES:
${game.questions_asked < 5 ? '- Early game: Give a hint about a specific property or characteristic (NOT the category, which is already known)' : ''}
${game.questions_asked >= 5 && game.questions_asked < 10 ? '- Mid game: Give a hint about specific characteristics, common uses, or distinguishing features' : ''}
${game.questions_asked >= 10 && game.questions_asked < 15 ? '- Late game: Give a more specific hint about features, origin, preparation, or context' : ''}
${game.questions_asked >= 15 ? '- Very late game: Give a strong hint that significantly narrows possibilities without revealing the answer' : ''}

IMPORTANT: 
- Make the hint helpful based on current progress
- Respond with ONLY the hint text - no JSON, no formatting, no explanations

Provide only the hint text:`

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
        content: `Search results: ${functionResult}\n\nBased on these search results and our conversation, provide hint #${game.hints_used + 1} about the secret item (${game.secret_item}). Respond with ONLY the hint text - no JSON, no formatting, no explanations.`
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