import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'
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
    const requestStart = Date.now()
    const { game_id, question }: AskQuestionRequest = await req.json()
    console.log(`[ask-question] Processing question: "${question.substring(0, 50)}..."`)

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
      .limit(1) // Explicit limit for performance
      .single()

    if (gameError) throw gameError
    if (!data) throw new Error('Game not found')
    if (data.status !== 'active') throw new Error('Game is not active')
    
    const game = data
    const messages = (data.game_messages || []).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Check if game is over
    if (game.questions_asked >= DEFAULT_GAME_LIMITS.questionsPerGame) {
      await supabase
        .from('games')
        .update({ status: 'lost' })
        .eq('id', game_id)
      
      // Return proper game over response instead of throwing error
      const responseData: AskQuestionResponse = {
        answer: `Game over! You've used all ${DEFAULT_GAME_LIMITS.questionsPerGame} questions. The answer was "${game.secret_item}".`,
        questions_remaining: 0,
        game_status: 'lost'
      }

      return EdgeFunctionBase.createSuccessResponse(responseData)
    }

    // Messages already fetched in the combined query above

    // Prepare messages for LLM with enhanced context
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))
    
    // Add consistency reminder if there's conversation history
    if (messages.length > 2) { // Only add if there's actual conversation history
      const consistencyReminder = `[CONSISTENCY REMINDER: Review all your previous answers above to ensure this response is consistent with what you've already established about the secret item.]`
      
      chatMessages.push({
        role: 'system',
        content: consistencyReminder
      })
    }
    
    // Add new question
    chatMessages.push({
      role: 'user',
      content: question
    })

    // Get LLM provider (lazy initialization with caching)
    const llmStart = Date.now()
    const provider = EdgeFunctionBase.getLLMProvider('ask-question')
    console.log(`[ask-question] LLM provider ready in ${Date.now() - llmStart}ms`)

    // Call LLM provider with search function available
    const llmCallStart = Date.now()
    let llmResponse = await provider.generateResponse({
      messages: chatMessages,
      temperature: 0.1,
      maxTokens: 80, // Reduced for faster responses
      functions: [SEARCH_FUNCTION],
      function_call: 'auto'
    })
    console.log(`[ask-question] LLM response received in ${Date.now() - llmCallStart}ms`)

    // Handle function calls
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
        content: `Search results: ${functionResult}\n\nBased on these search results, answer the original question "${question}" with ONLY the strict JSON format: {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}. Do not include any explanations or additional text.`
      })
      
      // Call LLM again with search results
      const secondCallStart = Date.now()
      llmResponse = await provider.generateResponse({
        messages: chatMessages,
        temperature: 0.1,
        maxTokens: 40 // Reduced for faster responses
      })
      console.log(`[ask-question] Second LLM call completed in ${Date.now() - secondCallStart}ms`)
    }

    const rawResponse = llmResponse.content

    // Parse the response from LLM
    const parsedResponse = ResponseParser.parseGameResponse(rawResponse)

    const answer = parsedResponse.answer
    const isGuess = parsedResponse.is_guess || false
    const questionNumber = game.questions_asked + 1

    // Game is won if LLM returned is_guess=true (only happens when answer=Yes and correct guess)
    // Additional validation: is_guess should ONLY be true if answer is Yes
    const gameWon = parsedResponse.is_guess === true && answer.toLowerCase().includes('yes')
    
    // Safety validation - log suspicious cases
    ResponseParser.validateGameResponse(parsedResponse, rawResponse, question, game.secret_item)

    // Determine game status
    let gameStatus: 'active' | 'won' | 'lost' = 'active'
    if (gameWon) {
      gameStatus = 'won'
    } else if (questionNumber >= DEFAULT_GAME_LIMITS.questionsPerGame) {
      gameStatus = 'lost'
    }

    // Batch insert messages and update game in parallel for better performance
    const dbStart = Date.now()
    const [insertResult, updateResult] = await Promise.all([
      supabase
        .from('game_messages')
        .insert([
          {
            game_id: game_id,
            role: 'user',
            content: question,
            message_type: isGuess ? 'guess' : 'question',
            question_number: questionNumber
          },
          {
            game_id: game_id,
            role: 'assistant',
            content: answer,
            message_type: 'answer',
            question_number: questionNumber
          }
        ])
        .select('id'), // Only return IDs for performance
      supabase
        .from('games')
        .update({ 
          questions_asked: questionNumber,
          status: gameStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', game_id)
        .select('id') // Only return ID for performance
    ])
    console.log(`[ask-question] Database operations completed in ${Date.now() - dbStart}ms`)

    if (insertResult.error) throw insertResult.error
    if (updateResult.error) throw updateResult.error

    // Game cleanup is now handled by database triggers
    // No need for setTimeout - triggers will handle cleanup automatically

    const questionsRemaining = DEFAULT_GAME_LIMITS.questionsPerGame - questionNumber

    const responseData: AskQuestionResponse = {
      answer: gameWon 
        ? `${answer}! You got it! The answer was "${game.secret_item}".`
        : gameStatus === 'lost' 
          ? `${answer} Game over! You've used all ${DEFAULT_GAME_LIMITS.questionsPerGame} questions. The answer was "${game.secret_item}".`
          : answer,
      questions_remaining: questionsRemaining,
      game_status: gameStatus
    }
    
    const totalTime = Date.now() - requestStart
    console.log(`[ask-question] Total request completed in ${totalTime}ms`)

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error)
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)