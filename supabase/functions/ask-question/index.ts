import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'
import { ResponseParser } from '../_shared/llm/index.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DEFAULT_GAME_LIMITS } from '../_shared/common/GameConfig.ts'
import { SEARCH_FUNCTION, FunctionHandler, createContextualSearchFunction } from '../_shared/llm/functions.ts'
import { ConversationState } from '../_shared/state/ConversationState.ts'

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
    const messages = (data.game_messages || []).sort((a: any, b: any) => 
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
    const chatMessages = messages.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))
    
    // Enhanced consistency tracking with fact extraction
    if (messages.length > 2) { // Only add if there's actual conversation history
      // Extract structured facts from conversation
      const facts = ConversationState.extractFacts(messages)
      
      // Build comprehensive fact summary
      let factSummary = '[ESTABLISHED FACTS - MAINTAIN CONSISTENCY]\n'
      
      if (facts.confirmed_yes.length > 0) {
        factSummary += '\nCONFIRMED TRUE (Previous YES answers):\n'
        facts.confirmed_yes.forEach(fact => {
          factSummary += `  ✓ ${fact.question} (Confidence: ${Math.round(fact.confidence * 100)}%)\n`
        })
      }
      
      if (facts.confirmed_no.length > 0) {
        factSummary += '\nCONFIRMED FALSE (Previous NO answers):\n'
        facts.confirmed_no.forEach(fact => {
          factSummary += `  ✗ ${fact.question} (Confidence: ${Math.round(fact.confidence * 100)}%)\n`
        })
      }
      
      if (facts.uncertain.length > 0) {
        factSummary += '\nUNCERTAIN (Maybe/Sometimes answers):\n'
        facts.uncertain.forEach(fact => {
          factSummary += `  ? ${fact.question} → ${fact.answer}\n`
        })
      }
      
      factSummary += '\n🚨 CRITICAL: Your answer to the current question MUST be logically consistent with ALL facts above.'
      factSummary += '\n🧠 LOGICAL DEDUCTION: Use established facts to answer, don\'t contradict previous responses.'
      
      // Add enhanced consistency reminder
      chatMessages.push({
        role: 'system',
        content: factSummary
      })
      
      // Add logical consistency check prompt
      const logicalCheck = `[LOGICAL CONSISTENCY CHECK]\nBefore answering "${question}", verify:\n1. Does this answer contradict any established facts above?\n2. Can I deduce this answer from what's already confirmed?\n3. Am I being consistent with the secret item's established properties?\n\nIf you can deduce the answer from established facts, use that deduction.`
      
      chatMessages.push({
        role: 'system',
        content: logicalCheck
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

    // Call LLM provider with contextual search function
    const llmCallStart = Date.now()
    const contextualSearchFunction = createContextualSearchFunction(game.category, game.secret_item)
    
    let llmResponse = await provider.generateResponse({
      messages: chatMessages,
      temperature: 0.1,
      maxTokens: 80, // Reduced for faster responses
      functions: [contextualSearchFunction],
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
    
    // Enhanced validation with fact checking
    ResponseParser.validateGameResponse(parsedResponse, rawResponse, question, game.secret_item)
    
    // Additional consistency validation
    if (messages.length > 2) {
      const facts = ConversationState.extractFacts(messages)
      const isConsistent = validateAnswerConsistency(question, answer, facts, game.secret_item)
      
      if (!isConsistent) {
        console.warn(`[ask-question] Potential inconsistency detected for question: "${question}" answer: "${answer}"`)
        console.warn(`[ask-question] Secret item: "${game.secret_item}"`)
        console.warn(`[ask-question] Established facts:`, facts)
      }
    }

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
    return EdgeFunctionBase.createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Validates if the current answer is consistent with established facts
 */
function validateAnswerConsistency(
  question: string, 
  answer: string, 
  facts: any, 
  secretItem: string
): boolean {
  // Simple consistency checks - could be much more sophisticated
  const questionLower = question.toLowerCase()
  const answerLower = answer.toLowerCase()
  const isYesAnswer = answerLower.includes('yes')
  const isNoAnswer = answerLower.includes('no')
  
  // Check if we're contradicting a previous answer
  for (const fact of [...facts.confirmed_yes, ...facts.confirmed_no]) {
    const factQuestion = fact.question.toLowerCase()
    
    // Simple similarity check
    if (questionsAreSimilar(questionLower, factQuestion)) {
      const factWasYes = facts.confirmed_yes.includes(fact)
      if (factWasYes && isNoAnswer) {
        console.warn(`[consistency] Contradiction detected: Previously answered YES to "${fact.question}", now answering NO to "${question}"`)
        return false
      }
      if (!factWasYes && isYesAnswer) {
        console.warn(`[consistency] Contradiction detected: Previously answered NO to "${fact.question}", now answering YES to "${question}"`)
        return false
      }
    }
  }
  
  return true
}

/**
 * Simple function to check if two questions are asking about the same thing
 */
function questionsAreSimilar(q1: string, q2: string): boolean {
  // Remove common question words and punctuation
  const normalize = (s: string) => s.replace(/[^a-z0-9\s]/g, '').replace(/\b(is|it|a|an|the|does|do|can|will|would)\b/g, '').replace(/\s+/g, ' ').trim()
  
  const n1 = normalize(q1)
  const n2 = normalize(q2)
  
  // Check for substantial word overlap
  const words1 = n1.split(' ').filter(w => w.length > 2)
  const words2 = n2.split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return false
  
  const overlap = words1.filter(w => words2.includes(w))
  const overlapRatio = overlap.length / Math.min(words1.length, words2.length)
  
  return overlapRatio > 0.6 // 60% word overlap threshold
}

// Export handler for tests
export default handler

// Start server
serve(handler)