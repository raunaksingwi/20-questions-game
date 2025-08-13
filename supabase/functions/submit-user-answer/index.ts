import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SubmitUserAnswerRequest, SubmitUserAnswerResponse, isValidUUID, isValidString, isValidAnswerType } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'

// Initialize shared Supabase client
const supabase = EdgeFunctionBase.initialize()

const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const requestStart = Date.now()
    const body = await req.json()
    
    // Validate request body structure
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body: must be a JSON object')
    }
    
    const { session_id, answer, answer_type }: SubmitUserAnswerRequest = body
    
    // Validate required fields
    if (!session_id || !isValidUUID(session_id)) {
      throw new Error('Invalid session_id: must be a valid UUID')
    }
    
    if (!answer || !isValidString(answer, 1, 500)) {
      throw new Error('Invalid answer: must be a non-empty string with max 500 characters')
    }
    
    if (!answer_type || !isValidAnswerType(answer_type)) {
      throw new Error('Invalid answer_type: must be one of chip, text, or voice')
    }
    
    console.log(`[submit-user-answer] Processing answer: "${answer}" (${answer_type})`)

    // Get session data and conversation history
    const { data: session, error: sessionError } = await supabase
      .from('games')
      .select('id, category, questions_asked, status')
      .eq('id', session_id)
      .eq('mode', 'ai_guessing')
      .single()

    if (sessionError || !session) {
      throw new Error('AI Guessing mode session not found')
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active')
    }

    // Get conversation history for context
    const { data: messages, error: messagesError } = await supabase
      .from('game_messages')
      .select('role, content, question_number')
      .eq('game_id', session_id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    // Check if answer is "Don't know" - these shouldn't count toward question limit
    const isCurrentDontKnow = answer.toLowerCase().trim() === "don't know"
    
    // Find the highest question number in the messages to determine next question number
    const maxQuestionNumber = messages.length > 0 
      ? Math.max(...messages.map(m => m.question_number || 0))
      : 0
    const currentQuestionNumber = maxQuestionNumber
    const nextQuestionNumber = maxQuestionNumber + 1
    
    // For game state tracking: only count non-"Don't know" answers toward the limit
    const questionsCountedForLimit = isCurrentDontKnow ? session.questions_asked : session.questions_asked + 1
    
    // Store user's answer
    const msgStart = Date.now()
    await supabase
      .from('game_messages')
      .insert({
        game_id: session_id,
        role: 'user',
        content: answer,
        message_type: 'answer',
        question_number: currentQuestionNumber,
        created_at: new Date().toISOString()
      })
    console.log(`[submit-user-answer] User answer stored in ${Date.now() - msgStart}ms`)

    // Check if the last assistant question was a specific guess (e.g., "Is it X?") and
    // the user answered Yes, end the game as LLM win immediately (check this BEFORE question limit)
    const guessPattern = /^\s*(is|was|could)\s+(it|this|that|the\s+\w+)\s+(be\s+)?(a\s+|an\s+)\w+.*\?\s*$/i
    const lastAssistantQuestion = [...messages]
      .reverse()
      .find(m => m.role === 'assistant')?.content || ''
    
    console.log(`[submit-user-answer] Last assistant question: "${lastAssistantQuestion}"`)
    console.log(`[submit-user-answer] User answer: "${answer}"`)
    console.log(`[submit-user-answer] Guess pattern match: ${guessPattern.test(lastAssistantQuestion)}`)
    
    const isAffirmative = (s: string) => {
      const n = s.toLowerCase().trim()
      return n === 'yes' || n.startsWith('y')
    }
    
    console.log(`[submit-user-answer] Is affirmative: ${isAffirmative(answer)}`)
    
    if (guessPattern.test(lastAssistantQuestion) && isAffirmative(answer)) {
      await supabase
        .from('games')
        .update({ 
          status: 'won', // LLM wins
          questions_asked: questionsCountedForLimit,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id)

      const responseData: SubmitUserAnswerResponse = {
        questions_asked: questionsCountedForLimit,
        questions_remaining: Math.max(0, 20 - questionsCountedForLimit),
        game_status: 'won'
        // No next_question - game is over
      }
      return EdgeFunctionBase.createSuccessResponse(responseData)
    }

    // Check if we've reached the 20 question limit (only for answers that count)
    if (!isCurrentDontKnow && questionsCountedForLimit >= 20) {
      // Auto-lose: LLM used all questions without guessing correctly
      await supabase
        .from('games')
        .update({ 
          status: 'lost', // LLM loses
          questions_asked: 20,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id)

      const responseData: SubmitUserAnswerResponse = {
        questions_asked: 20,
        questions_remaining: 0,
        game_status: 'lost'
        // No next_question - game is over
      }

      return EdgeFunctionBase.createSuccessResponse(responseData)
    }

    // Generate next question using LLM with full conversation context
    const llmStart = Date.now()
    const llmProvider = EdgeFunctionBase.getLLMProvider('submit-user-answer')
    
    // Build conversation context
    let conversationContext = `Previous conversation:\n`
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.question_number > 0) {
        conversationContext += `Q${msg.question_number}: ${msg.content}\n`
      } else if (msg.role === 'user' && msg.question_number > 0) {
        conversationContext += `A${msg.question_number}: ${msg.content}\n`
      }
    })
    
    // Add current answer
    conversationContext += `A${currentQuestionNumber}: ${answer}\n`

    // Build categorized summary (Yes / No / Maybe-Unknown)
    const questionsByNumber: Record<number, string> = {}
    const answersByNumber: Record<number, string> = {}
    messages.forEach(msg => {
      if (msg.question_number && msg.question_number > 0) {
        if (msg.role === 'assistant') {
          questionsByNumber[msg.question_number] = msg.content
        } else if (msg.role === 'user') {
          answersByNumber[msg.question_number] = msg.content
        }
      }
    })
    // Ensure the just-submitted answer is included
    answersByNumber[currentQuestionNumber] = answer

    const normalize = (s: string) => s.toLowerCase().trim()
    const isAffirmativeAnswer = (s: string) => {
      const n = normalize(s)
      return n.startsWith('y') || n === 'yes' || n.includes('yeah') || n.includes('yep')
    }
    const isNegativeAnswer = (s: string) => {
      const n = normalize(s)
      return n.startsWith('n') || n === 'no' || n.includes('nope')
    }
    const isDontKnowAnswer = (s: string) => {
      const n = normalize(s)
      return n.includes("don't know") || n.includes('dont know') || n.includes('unknown')
    }
    const isMaybeAnswer = (s: string) => {
      const n = normalize(s)
      return n.includes('maybe') || n.includes('sometimes') || n.includes('it depends')
    }

    const yesFacts: Array<{ n: number, q: string }> = []
    const noFacts: Array<{ n: number, q: string }> = []
    const unknownFacts: Array<{ n: number, q: string }> = []

    Object.keys(questionsByNumber)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .forEach(n => {
        const q = questionsByNumber[n]
        const a = answersByNumber[n]
        if (!q || !a) return
        if (isAffirmativeAnswer(a)) {
          yesFacts.push({ n, q })
        } else if (isNegativeAnswer(a)) {
          noFacts.push({ n, q })
        } else if (isDontKnowAnswer(a) || isMaybeAnswer(a)) {
          unknownFacts.push({ n, q })
        }
      })

    // Create a more comprehensive context that helps prevent redundancy
    let categorizedSummary = 'ESTABLISHED FACTS - Use these to avoid redundant questions:\n'
    
    if (yesFacts.length > 0) {
      categorizedSummary += '\n✓ CONFIRMED TRUE (YES answers):\n'
      yesFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    if (noFacts.length > 0) {
      categorizedSummary += '\n✗ CONFIRMED FALSE (NO answers):\n'
      noFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    if (unknownFacts.length > 0) {
      categorizedSummary += '\n? UNCERTAIN (Maybe/Unknown answers):\n'
      unknownFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    // Add logical deduction helper
    if (yesFacts.length >= 2) {
      categorizedSummary += '\n⚠️  REDUNDANCY CHECK: The item already has ALL of these properties confirmed as TRUE.\n'
      categorizedSummary += 'Do NOT ask about combinations of these confirmed properties.\n'
    }

    const totalQuestionsUsed = questionsCountedForLimit
    const yesNoFactsCount = yesFacts.length + noFacts.length
    const minQuestionsForGuess = 14
    const minFactsForGuess = 6
    const allowGuessEarly = totalQuestionsUsed >= minQuestionsForGuess || yesNoFactsCount >= minFactsForGuess
    
    const systemPrompt = `You are playing 20 Questions in AI Guessing mode. The user has thought of an item within the category: ${session.category}.
Your job is to ask up to 20 yes/no questions to identify the item.

 CRITICAL ANTI-REDUNDANCY RULES:
 🚫 NEVER ask about combinations or variations of facts already confirmed as TRUE
 🚫 NEVER ask essentially the same question in different words  
 🚫 NEVER ask "Does it have A and B?" if you already know A=YES and B=YES
 🧠 USE LOGICAL DEDUCTION: If curved=YES and hooked=YES, then "curved and hooked"=YES automatically

 Questioning Strategy:
- Start with BROAD categorical questions to divide the category into major groups
- Each question should eliminate roughly half of the remaining possibilities
- Use established facts to narrow down logically, don't re-verify them
- Move to NEW distinguishing properties that haven't been explored
- Progress: Physical traits → Habitat → Behavior → Size → Specific identification

 Hard constraints you must obey:
 - Every new question MUST be consistent with ALL prior YES facts
 - Do NOT ask questions that contradict any prior NO facts
 - NEVER ask redundant questions about established facts
 - Choose questions that explore NEW dimensions of the remaining possibility space
 - Before asking, mentally check: "Is this already established by previous answers?"

Output format requirements:
- Output ONLY the bare question text as a single line ending with a question mark.
- Do NOT include numbering, prefixes, explanations, qualifiers, or any other text.
- If you are highly confident (e.g., only 1-2 plausible items remain), make a specific confirmatory guess phrased as "Is it <item>?". Otherwise, ask a property-based yes/no question to further narrow down.

Rules:
- Ask exactly one yes/no question per turn
- Keep each question short and unambiguous
- CRITICAL: Questions must be answerable with YES or NO only
- NEVER ask "Is it A or B?" - instead ask "Is it A?" or "Is it B?"
- NEVER present multiple options in a single question
- Stay strictly within the category
- Use the user's answers to systematically narrow down the possibilities
- Only ask specific item confirmations when you've narrowed it down significantly
- User can answer: Yes, No, Maybe, or "Don't know" (Don't know responses don't count toward the 20 question limit)
- Do not reveal internal reasoning or ask multiple questions at once
- Stop asking after 20 meaningful questions; await result

QUESTION ${totalQuestionsUsed + 1} of 20 - Make it count!

${categorizedSummary}

CONVERSATION HISTORY (to avoid repeating questions):
${conversationContext}

Before asking your next question, think:
1. What NEW information do I need that isn't already established above?
2. What dimension haven't I explored yet?
3. Is this question redundant with established facts?
4. Have I already asked this question in the conversation history above?

Output only your next strategic yes/no question that explores NEW territory.`

    const userPrompt = `Based on my previous answers, ask your next yes/no question.`

    let llmResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemPrompt,
      temperature: 0.2,
      maxTokens: 160
    })
    let nextQuestion = llmResponse.content
    
    // Check for invalid question formats (multiple choice, contradictory structure)
    const invalidPatterns = [
      /\bor\b/i,  // Contains "or" 
      /\ba or b\b/i, // Direct A or B pattern
      /small or large/i, // Size comparisons
      /big or small/i,
      /\?.*\?/  // Multiple question marks
    ]
    
    const hasInvalidFormat = invalidPatterns.some(pattern => pattern.test(nextQuestion))
    
    if (hasInvalidFormat) {
      const correctiveSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Your previous question had an invalid format. Questions must be simple YES/NO format only. Never use "or", never present multiple options. Regenerate as a simple, single-property yes/no question.`
      const correctiveUserPrompt = `Regenerate as a proper yes/no question without "or" or multiple options.`
      llmResponse = await llmProvider.generateResponse({
        messages: [{ role: 'user', content: correctiveUserPrompt }],
        systemPrompt: correctiveSystemPrompt,
        temperature: 0.1,
        maxTokens: 100
      })
      nextQuestion = llmResponse.content
      console.log(`[submit-user-answer] Corrected invalid question format: "${nextQuestion}"`)
    }
    
    const forbidGuessUntil = 14
    if (guessPattern.test(nextQuestion) && totalQuestionsUsed < forbidGuessUntil) {
      const correctiveSystemPrompt = `${systemPrompt}\n\nAdditional hard rule: Do not guess specific items before question ${forbidGuessUntil}. Regenerate a non-guess, property-based yes/no question that partitions the remaining space. Output only the bare question text.`
      const correctiveUserPrompt = `Regenerate a non-guess yes/no property question (question ${nextQuestionNumber}).`
      llmResponse = await llmProvider.generateResponse({
        messages: [{ role: 'user', content: correctiveUserPrompt }],
        systemPrompt: correctiveSystemPrompt,
        temperature: 0.15,
        maxTokens: 120
      })
      nextQuestion = llmResponse.content
    }
    console.log(`[submit-user-answer] Next question generated in ${Date.now() - llmStart}ms`)

    // Store LLM's next question and update game state using transaction
    const updateStart = Date.now()
    const { error: updateError } = await supabase.rpc('submit_user_answer_transaction', {
      p_session_id: session_id,
      p_next_question: nextQuestion,
      p_questions_asked: questionsCountedForLimit,
      p_question_number: nextQuestionNumber,
      p_timestamp: new Date().toISOString()
    });
    
    if (updateError) {
      // Fallback to individual operations if RPC fails
      console.warn('[submit-user-answer] RPC failed, using fallback approach:', updateError);
      
      const [messageResult, gameResult] = await Promise.all([
        supabase
          .from('game_messages')
          .insert({
            game_id: session_id,
            role: 'assistant',
            content: nextQuestion,
            message_type: 'question',
            question_number: nextQuestionNumber,
            created_at: new Date().toISOString()
          }),
        supabase
          .from('games')
          .update({ 
            questions_asked: questionsCountedForLimit,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
      ]);
      
      if (messageResult.error) {
        console.error('[submit-user-answer] Failed to store LLM question:', messageResult.error);
        throw new Error(`Failed to store LLM question: ${messageResult.error.message}`);
      }
      
      if (gameResult.error) {
        console.error('[submit-user-answer] Failed to update game state:', gameResult.error);
        throw new Error(`Failed to update game state: ${gameResult.error.message}`);
      }
    }
    
    console.log(`[submit-user-answer] Updates completed in ${Date.now() - updateStart}ms`)

    const responseData: SubmitUserAnswerResponse = {
      next_question: nextQuestion,
      questions_asked: questionsCountedForLimit,
      questions_remaining: 20 - questionsCountedForLimit,
      game_status: 'active'
    }
    
    const totalTime = Date.now() - requestStart
    console.log(`[submit-user-answer] Total request completed in ${totalTime}ms`)

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error)
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)