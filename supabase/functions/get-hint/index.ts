import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'
import { ResponseParser } from '../_shared/llm/index.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DEFAULT_GAME_LIMITS } from '../_shared/common/GameConfig.ts'
import { SEARCH_FUNCTION, FunctionHandler } from '../_shared/llm/functions.ts'
import { ConversationState } from '../_shared/state/ConversationState.ts'

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

    // Extract structured facts from conversation to avoid repeating known information
    const previousHints = messages.filter((m: any) => m.role === 'assistant' && m.message_type === 'hint')
    const facts = ConversationState.extractFacts(messages as any)
    
    // Build comprehensive summary of known information
    let conversationSummary = `[HINT GENERATION CONTEXT:
- Total questions asked: ${game.questions_asked}
- Previous hints given: ${previousHints.length}
- Current progress: Question #${game.questions_asked + 1} of 20

ESTABLISHED FACTS - DO NOT REPEAT THIS INFORMATION IN HINT:`

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

    conversationSummary += `\n\n🚨 CRITICAL INSTRUCTION: Your hint MUST provide NEW information that the player doesn't already know from the established facts above.]`

    // Add conversation summary
    chatMessages.push({
      role: 'system',
      content: conversationSummary
    })

    // Generate a hint that focuses on unexplored information
    const hintPrompt = `You are providing hint #${game.hints_used + 1} about the secret item: "${game.secret_item}"

CRITICAL REQUIREMENTS:
1. MUST be consistent with ALL previous answers in the conversation
2. MUST provide completely NEW information - do NOT repeat anything from the established facts listed above
3. Focus on aspects of the item that have NOT been explored through questions yet
4. Don't reveal the answer directly, but provide genuinely helpful new information
5. Consider what types of questions the player HASN'T asked yet about this item

HINT STRATEGY - FOCUS ON UNEXPLORED AREAS:
${facts.confirmed_yes.length === 0 && facts.confirmed_no.length === 0 ? 
  '- No facts established yet. Give a hint about a key characteristic or property.' : 
  `- Player has established ${facts.confirmed_yes.length + facts.confirmed_no.length} facts. Focus on a different aspect they haven\'t explored.`
}

GAME PROGRESSION GUIDELINES:
${game.questions_asked < 5 ? '- Early game: Hint about a distinctive property or feature (but avoid what they already know)' : ''}
${game.questions_asked >= 5 && game.questions_asked < 10 ? '- Mid game: Hint about specific uses, characteristics, or context (that they haven\'t discovered)' : ''}
${game.questions_asked >= 10 && game.questions_asked < 15 ? '- Late game: More specific hint about origin, preparation, behavior, or distinctive features' : ''}
${game.questions_asked >= 15 ? '- Very late game: Strong hint that significantly narrows possibilities without giving the answer' : ''}

ANALYSIS INSTRUCTION:
1. Look at what the player already knows from the established facts above
2. Identify what aspects of the item they haven't explored yet
3. Provide a hint about one of those unexplored aspects
4. Make it helpful but not too obvious

Respond with ONLY the hint text - no JSON, no formatting, no explanations:`

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
        content: `Search results: ${functionResult}\n\nBased on these search results and the established facts from our conversation, provide hint #${game.hints_used + 1} about the secret item (${game.secret_item}). Remember: provide completely NEW information that the player doesn't already know from the established facts. Focus on unexplored aspects of the item. Respond with ONLY the hint text - no JSON, no formatting, no explanations.`
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