/**
 * Edge function that processes user questions in the 20 Questions game.
 * Uses LLM to generate contextually appropriate yes/no answers while maintaining consistency.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'
import { ResponseParser } from '../_shared/llm/index.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DEFAULT_GAME_LIMITS } from '../_shared/common/GameConfig.ts'
import { SEARCH_FUNCTION, FunctionHandler, createContextualSearchFunction } from '../_shared/llm/functions.ts'
import { ConversationState } from '../_shared/state/ConversationState.ts'

// Initialize shared services
const supabase = EdgeFunctionBase.initialize()

/**
 * Handles question processing requests with consistency tracking and guess detection.
 * Maintains conversation context and validates answer consistency.
 */
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
    
    // Enhanced fact tracking with accuracy prioritization
    if (messages.length > 2) { // Only add if there's actual conversation history
      // Extract structured facts from conversation
      const facts = ConversationState.extractFacts(messages)
      
      // Build comprehensive fact summary with accuracy warnings
      let factSummary = '[PREVIOUS FACTS - ACCURACY FIRST, VERIFY IF UNCERTAIN]\n'
      
      if (facts.confirmed_yes.length > 0) {
        factSummary += '\nPrevious YES answers (verify if uncertain):\n'
        facts.confirmed_yes.forEach(fact => {
          const confidence = Math.round(fact.confidence * 100)
          const warning = confidence < 80 ? ' ⚠️  LOW CONFIDENCE - VERIFY WITH SEARCH' : ''
          factSummary += `  ✓ ${fact.question} (Confidence: ${confidence}%)${warning}\n`
        })
      }
      
      if (facts.confirmed_no.length > 0) {
        factSummary += '\nPrevious NO answers (verify if uncertain):\n'
        facts.confirmed_no.forEach(fact => {
          const confidence = Math.round(fact.confidence * 100)
          const warning = confidence < 80 ? ' ⚠️  LOW CONFIDENCE - VERIFY WITH SEARCH' : ''
          factSummary += `  ✗ ${fact.question} (Confidence: ${confidence}%)${warning}\n`
        })
      }
      
      if (facts.uncertain.length > 0) {
        factSummary += '\nUNCERTAIN answers (consider verification):\n'
        facts.uncertain.forEach(fact => {
          factSummary += `  ? ${fact.question} → ${fact.answer}\n`
        })
      }
      
      factSummary += '\n🎯 ACCURACY PROTOCOL:\n'
      factSummary += '- If web search reveals different information than above, TRUST THE SEARCH RESULTS\n'
      factSummary += '- Correct answers are better than consistent wrong answers\n'
      factSummary += '- When uncertain about previous facts, verify with search before answering'
      
      // Add enhanced accuracy reminder
      chatMessages.push({
        role: 'system',
        content: factSummary
      })
      
      // Add fact verification check prompt
      const verificationCheck = `[FACT VERIFICATION CHECK]\nBefore answering "${question}":\n1. Could this question reveal if any previous answers were incorrect?\n2. Do I need to search to verify facts about the secret item?\n3. Should I trust search results over previous conversation if they conflict?\n\nPRIORITY: Accuracy > Consistency. If search reveals better information, use it.`
      
      chatMessages.push({
        role: 'system',
        content: verificationCheck
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
    
    // Enhanced accuracy validation (allows corrections)
    if (messages.length > 2) {
      const facts = ConversationState.extractFacts(messages)
      const isAccurate = validateAnswerAccuracy(question, answer, facts, game.secret_item, rawResponse)
      
      if (!isAccurate) {
        console.warn(`[ask-question] Accuracy validation failed for question: "${question}" answer: "${answer}"`)
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
 * Validates answer accuracy while allowing corrections of previous misinformation.
 * Prioritizes factual accuracy over conversation consistency.
 */
function validateAnswerAccuracy(
  question: string, 
  answer: string, 
  facts: any, 
  secretItem: string,
  rawResponse: string
): boolean {
  const questionLower = question.toLowerCase()
  const answerLower = answer.toLowerCase()
  const isYesAnswer = answerLower.includes('yes')
  const isNoAnswer = answerLower.includes('no')
  
  // Check if this might be a fact correction (search was used)
  const usedSearch = rawResponse.includes('SEARCH FUNCTION CALLED')
  const lowConfidenceFacts = [...facts.confirmed_yes, ...facts.confirmed_no].filter(
    fact => fact.confidence < 0.8
  )
  
  // Check for potential contradictions
  for (const fact of [...facts.confirmed_yes, ...facts.confirmed_no]) {
    const factQuestion = fact.question.toLowerCase()
    
    if (questionsAreSimilar(questionLower, factQuestion)) {
      const factWasYes = facts.confirmed_yes.includes(fact)
      const isContradiction = (factWasYes && isNoAnswer) || (!factWasYes && isYesAnswer)
      
      if (isContradiction) {
        // Allow contradiction if:
        // 1. Search was used (likely fact correction)
        // 2. Previous fact had low confidence
        // 3. Current question is more specific/recent
        if (usedSearch) {
          console.info(`[accuracy] FACT CORRECTION: Search-based answer contradicts previous response. Trusting search results.`, {
            previous_question: fact.question,
            previous_answer: factWasYes ? 'YES' : 'NO',
            current_question: question,
            current_answer: answer,
            secret_item: secretItem
          })
          return true // Allow the correction
        }
        
        if (fact.confidence < 0.8) {
          console.info(`[accuracy] LOW CONFIDENCE OVERRIDE: Overriding low-confidence previous answer.`, {
            previous_question: fact.question,
            previous_confidence: fact.confidence,
            current_question: question,
            current_answer: answer
          })
          return true // Allow override of low-confidence facts
        }
        
        // Traditional consistency warning (but don't block)
        console.warn(`[accuracy] POTENTIAL CONTRADICTION: Current answer conflicts with previous response. Consider verification.`, {
          previous_question: fact.question,
          previous_answer: factWasYes ? 'YES' : 'NO',
          current_question: question,
          current_answer: answer,
          used_search: usedSearch,
          previous_confidence: fact.confidence
        })
        
        // Return true (allow) but log for monitoring
        return true
      }
    }
  }
  
  return true
}

/**
 * Determines if two questions are semantically similar using enhanced comparison.
 * Used to detect potential contradictions in responses.
 */
function questionsAreSimilar(q1: string, q2: string): boolean {
  // Remove common question words and punctuation
  const normalize = (s: string) => s.replace(/[^a-z0-9\s]/g, '').replace(/\b(is|it|a|an|the|does|do|can|will|would|they|he|she)\b/g, '').replace(/\s+/g, ' ').trim()
  
  const n1 = normalize(q1)
  const n2 = normalize(q2)
  
  // Enhanced semantic similarity checks
  
  // 1. Exact substring match (one question contains the other)
  if (n1.includes(n2) || n2.includes(n1)) {
    return true
  }
  
  // 2. Common semantic patterns
  const semanticPatterns = [
    // Status patterns
    [/\b(active|playing|current)\b/, /\b(retired|former|ex)\b/],
    [/\b(alive|living)\b/, /\b(dead|deceased)\b/],
    [/\b(married|spouse|wife|husband)\b/, /\b(single|divorced|unmarried)\b/],
    // Temporal patterns  
    [/\b(current|now|present)\b/, /\b(past|former|previous|old)\b/],
    [/\b(still|continues|ongoing)\b/, /\b(no longer|stopped|ended)\b/],
    // Physical characteristics
    [/\b(large|big|huge)\b/, /\b(small|tiny|little)\b/],
    [/\b(fast|quick|rapid)\b/, /\b(slow|sluggish)\b/],
    [/\b(hot|warm)\b/, /\b(cold|cool|freezing)\b/]
  ]
  
  for (const [pattern1, pattern2] of semanticPatterns) {
    if ((pattern1.test(n1) && pattern2.test(n2)) || (pattern2.test(n1) && pattern1.test(n2))) {
      return true // Potentially contradictory semantic concepts
    }
  }
  
  // 3. Word overlap analysis (improved)
  const words1 = n1.split(' ').filter(w => w.length > 2)
  const words2 = n2.split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return false
  
  const overlap = words1.filter(w => words2.includes(w))
  const overlapRatio = overlap.length / Math.min(words1.length, words2.length)
  
  // Lower threshold but require meaningful words
  if (overlapRatio > 0.5 && overlap.length >= 2) {
    return true
  }
  
  // 4. Key concept similarity (for important topics)
  const keyConceptWords = ['captain', 'leader', 'best', 'champion', 'winner', 'record', 'nationality', 'country', 'team', 'club']
  const hasKeyWords1 = words1.some(w => keyConceptWords.includes(w))
  const hasKeyWords2 = words2.some(w => keyConceptWords.includes(w))
  
  if (hasKeyWords1 && hasKeyWords2 && overlapRatio > 0.4) {
    return true
  }
  
  return false
}

// Export handler for tests
export default handler

// Start server
serve(handler)