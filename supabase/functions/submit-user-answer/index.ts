import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SubmitUserAnswerRequest, SubmitUserAnswerResponse, isValidUUID, isValidString, isValidAnswerType } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DecisionTree } from '../_shared/logic/DecisionTree.ts'
import { AIQuestioningTemplateFactory } from '../_shared/prompts/AIQuestioningTemplate.ts'

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

    // Automatic guess detection removed - let user control LLM wins via win button
    console.log(`[submit-user-answer] User answer: "${answer}" - continuing game`)

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
    
    // Add explicit question repetition prevention
    const allAskedQuestions: string[] = []
    Object.keys(questionsByNumber)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .forEach(n => {
        const q = questionsByNumber[n]
        if (q) allAskedQuestions.push(q)
      })

    if (allAskedQuestions.length > 0) {
      categorizedSummary += '\n🚫 ALREADY ASKED QUESTIONS - DO NOT REPEAT THESE EXACT QUESTIONS:\n'
      allAskedQuestions.forEach((q, index) => {
        categorizedSummary += `  ${index + 1}. ${q}\n`
      })
      categorizedSummary += 'CRITICAL: You must ask a NEW question that has never been asked before!\n'
    }

    // Add logical deduction helper and domain constraints
    if (yesFacts.length >= 2) {
      categorizedSummary += '\n⚠️  REDUNDANCY CHECK: The item already has ALL of these properties confirmed as TRUE.\n'
      categorizedSummary += 'Do NOT ask about combinations of these confirmed properties.\n'
    }
    
    // Special handling for uncertain responses
    const hasRecentUncertain = unknownFacts.some(fact => 
      fact.n === currentQuestionNumber || fact.n === currentQuestionNumber - 1
    )
    
    if (hasRecentUncertain) {
      categorizedSummary += '\n⚠️  UNCERTAIN RESPONSE DETECTED:\n'
      categorizedSummary += 'The user just gave an uncertain answer (Maybe/Don\'t know/Sometimes).\n'
      categorizedSummary += 'CRITICAL: Ask a completely DIFFERENT type of concrete question that they CAN answer definitively.\n'
      categorizedSummary += 'Move to a different aspect entirely - don\'t ask similar or vague questions.\n'
      categorizedSummary += '\n✅ CONCRETE PIVOT EXAMPLES:\n'
      categorizedSummary += '- If uncertain about era → pivot to geography: "Are they from Europe?"\n'
      categorizedSummary += '- If uncertain about region → pivot to role: "Were they a president?"\n'
      categorizedSummary += '- If uncertain about characteristics → pivot to time: "Are they still alive?"\n'
      categorizedSummary += '- If uncertain about role → pivot to gender: "Are they male?"\n'
      categorizedSummary += '\n❌ NEVER DO THESE AFTER UNCERTAIN RESPONSES:\n'
      categorizedSummary += '- "Does it have unique characteristics?" (vague)\n'
      categorizedSummary += '- "Is it from a specific region?" (vague)\n'
      categorizedSummary += '- "Does it have multiple forms?" (vague)\n'
      categorizedSummary += '- Ask the same type of question again\n'
      categorizedSummary += '\nSTRATEGY: Change topic to something concrete and binary!\n'
    }

    // Add domain constraint analysis instruction
    if (yesFacts.length > 0 || noFacts.length > 0) {
      categorizedSummary += '\n🎯 DOMAIN NARROWING ANALYSIS:\n'
      categorizedSummary += 'Before asking your next question, analyze what domain space remains possible based on ALL the confirmed facts above.\n'
      categorizedSummary += 'Ask yourself: "Given these confirmed facts, what specific sub-domain am I now working within?"\n'
      categorizedSummary += 'Your next question MUST further narrow within that established domain - do NOT jump to unrelated properties!\n'
      categorizedSummary += '\nExamples of proper domain narrowing:\n'
      categorizedSummary += '- If confirmed: "mammal + wild animal" → ask about size, habitat, diet within wild mammals\n'
      categorizedSummary += '- If confirmed: "cricket player + from Australia" → ask about batting/bowling, era, specific team\n'
      categorizedSummary += '- If confirmed: "electronic + found in home" → ask about size, room, specific function\n'
      categorizedSummary += '\n❌ DOMAIN VIOLATION EXAMPLES (DO NOT DO THIS):\n'
      categorizedSummary += '- If confirmed "mammal + wild" and you ask "Is it electronic?" (completely wrong domain)\n'
      categorizedSummary += '- If confirmed "Australian bowler" and you ask "Is it alive?" (already established as person)\n'
    }

    const totalQuestionsUsed = questionsCountedForLimit
    const yesNoFactsCount = yesFacts.length + noFacts.length
    
    // Use simplified decision tree approach
    const conversationHistory = messages.map(m => ({
      question: m.role === 'assistant' ? m.content : '',
      answer: m.role === 'user' ? m.content : ''
    })).filter(item => item.question && item.answer)
    
    // Add the current answer to history
    conversationHistory.push({
      question: messages.filter(m => m.role === 'assistant').pop()?.content || '',
      answer: answer
    })
    
    // Build conversation context for the AI questioning template
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

    // Get category items for decision tree
    const getCategoryItems = (category: string): string[] => {
      switch (category.toLowerCase()) {
        case 'animals': return ['dog', 'cat', 'elephant', 'lion', 'penguin', 'dolphin', 'eagle', 'snake', 'tiger', 'bear', 'rabbit', 'horse', 'cow', 'sheep', 'pig', 'chicken', 'duck', 'fish', 'shark', 'whale']
        case 'objects': return ['chair', 'computer', 'phone', 'book', 'car', 'bicycle', 'television', 'lamp', 'table', 'pen', 'pencil', 'watch', 'camera', 'guitar', 'piano', 'mirror', 'clock', 'scissors', 'hammer', 'screwdriver']
        case 'cricket players': return ['Virat Kohli', 'MS Dhoni', 'Rohit Sharma', 'Joe Root', 'Steve Smith', 'Kane Williamson', 'Babar Azam', 'AB de Villiers', 'Chris Gayle', 'David Warner', 'Ben Stokes', 'Jasprit Bumrah', 'Pat Cummins', 'Rashid Khan', 'Trent Boult']
        case 'football players': return ['Tom Brady', 'Patrick Mahomes', 'Aaron Rodgers', 'Josh Allen', 'Lamar Jackson', 'Russell Wilson', 'Dak Prescott', 'Justin Herbert', 'Joe Burrow', 'Derrick Henry', 'Christian McCaffrey', 'Cooper Kupp', 'Davante Adams', 'Travis Kelce', 'Aaron Donald']
        case 'world leaders': return [] // Will be handled by strategic questions above
        case 'nba players': return [] // Add if needed
        default: return []
      }
    }
    
    const categoryItems = getCategoryItems(session.category)
    
    let suggestedQuestion: string
    try {
      // Use decision tree logic to get optimal question
      suggestedQuestion = DecisionTree.generateOptimalQuestion(
        session.category,
        conversationHistory,
        categoryItems
      )
    } catch (error) {
      console.warn('[submit-user-answer] Decision tree failed, using fallback:', error)
      suggestedQuestion = '' // Will fall back to LLM generation
    }
    
    // Use the AI questioning template system
    const aiQuestioningTemplate = AIQuestioningTemplateFactory.createTemplate(session.category)
    const systemPrompt = aiQuestioningTemplate.generate(
      totalQuestionsUsed,
      conversationContext,
      allAskedQuestions
    )
    
    // Add the categorized summary for additional context
    const enhancedSystemPrompt = `${systemPrompt}

${categorizedSummary}

${suggestedQuestion ? `RECOMMENDED QUESTION: "${suggestedQuestion}"\nThis question was suggested by decision tree analysis for optimal information gain.\nUse this question unless it's clearly redundant with what you already know.` : ''}

LOGICAL DEDUCTION - If you know:
- "Is it a mammal?" = YES, then you know it's NOT a bird, reptile, or fish
- "Is it living?" = YES, then you know it's NOT electronic, furniture, or objects
- "Is it dead?" = YES, then you know it's NOT alive

AVOID REDUNDANCY:
- DON'T ask "Is it a bird?" if they already said YES to "Is it a mammal?"
- DON'T ask "Is it alive?" if they already answered about being dead
- DON'T ask compound questions like "Is it big or small?" - pick one

🚫 NEVER ASK VAGUE QUESTIONS:
- "Does it have unique characteristics?" → Ask "Are they male?" instead
- "Is it from a specific region?" → Ask "Are they from Europe?" instead  
- "Does it have multiple forms?" → Ask "Were they both military and political?" instead
- "Is it from a time period?" → Ask "Did they serve before 1990?" instead
- "Does it have notable aspects?" → Ask "Did they win a war?" instead

✅ ALWAYS ASK CONCRETE, SPECIFIC QUESTIONS:
- Geographic: "Are they from Asia?", "Did they lead Germany?"
- Temporal: "Did they serve before 1990?", "Were they active in the 2000s?"
- Demographic: "Are they male?", "Are they still alive?"
- Functional: "Were they a president?", "Did they win a Nobel Prize?"

Ask your next strategic yes/no question. Output ONLY the question.`

    const userPrompt = suggestedQuestion 
      ? `Use the recommended question "${suggestedQuestion}" unless it's clearly redundant. Otherwise, ask your next strategic yes/no question.`
      : `Ask your next strategic yes/no question that eliminates about half the remaining possibilities.`

    let llmResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: enhancedSystemPrompt,
      temperature: 0.05, // Very low for consistent, focused questions
      maxTokens: 100 // Reduced since we want just the question
    })
    let nextQuestion = llmResponse.content
    
    // Check for invalid question formats (multiple choice, contradictory structure, vague questions)
    const invalidPatterns = [
      /\bor\b/i,  // Contains "or" 
      /\ba or b\b/i, // Direct A or B pattern
      /small or large/i, // Size comparisons
      /big or small/i,
      /\?.*\?/  // Multiple question marks
    ]
    
    // Check for vague question patterns that should be avoided
    const vaguePatterns = [
      /unique characteristics/i,
      /special characteristics/i,
      /multiple forms/i,
      /variations/i,
      /specific region or time period/i,
      /specific region/i,
      /time period/i,
      /notable aspects/i,
      /particular qualities/i,
      /distinctive features/i,
      /any unique/i,
      /any special/i,
      /any notable/i,
      /specific attributes/i,
      /distinguishing features/i,
      /remarkable/i,
      /anything unique/i,
      /anything special/i,
      /anything notable/i,
      /specific details/i,
      /particular details/i
    ]
    
    const hasInvalidFormat = invalidPatterns.some(pattern => pattern.test(nextQuestion))
    const isVagueQuestion = vaguePatterns.some(pattern => pattern.test(nextQuestion))
    
    // Enhanced question repetition detection with semantic similarity
    const normalizeQuestion = (q: string) => {
      return q.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(is|it|a|an|the|does|do|can|will|would|are|they|have|has|did|was|were)\b/g, '') // Remove common question words
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    // Enhanced similarity calculation with semantic understanding
    function calculateSimilarity(str1: string, str2: string): number {
      const words1 = new Set(str1.split(' ').filter(w => w.length > 2)) // Ignore short words
      const words2 = new Set(str2.split(' ').filter(w => w.length > 2))
      
      const intersection = new Set([...words1].filter(w => words2.has(w)))
      const union = new Set([...words1, ...words2])
      
      return union.size > 0 ? intersection.size / union.size : 0
    }
    
    // Semantic similarity check for questions that ask about the same concept
    function areQuestionsSemanticallySimilar(q1: string, q2: string): boolean {
      const semanticGroups = [
        ['size', 'big', 'large', 'small', 'tiny', 'huge'],
        ['alive', 'living', 'life', 'dead', 'deceased'],
        ['male', 'female', 'man', 'woman', 'gender'],
        ['country', 'nation', 'nationality', 'from'],
        ['president', 'leader', 'prime minister', 'head'],
        ['time', 'era', 'period', 'century', 'decade', 'when'],
        ['color', 'coloured', 'colored'],
        ['electronic', 'digital', 'technology', 'tech'],
        ['mammal', 'animal', 'creature', 'species'],
        ['food', 'eat', 'edible', 'consume'],
        ['house', 'home', 'domestic', 'household'],
        ['region', 'area', 'place', 'location', 'where']
      ]
      
      const q1Lower = q1.toLowerCase()
      const q2Lower = q2.toLowerCase()
      
      for (const group of semanticGroups) {
        const q1HasGroup = group.some(word => q1Lower.includes(word))
        const q2HasGroup = group.some(word => q2Lower.includes(word))
        if (q1HasGroup && q2HasGroup) {
          return true
        }
      }
      
      return false
    }
    
    const normalizedNextQuestion = normalizeQuestion(nextQuestion)
    const isRepeatedQuestion = allAskedQuestions.some(existingQ => {
      const normalizedExisting = normalizeQuestion(existingQ)
      
      // Exact match after normalization
      if (normalizedExisting === normalizedNextQuestion) {
        console.log(`[submit-user-answer] Exact repetition detected: "${existingQ}" vs "${nextQuestion}"`)
        return true
      }
      
      // High similarity match (lowered threshold to 75% for better detection)
      const similarity = calculateSimilarity(normalizedExisting, normalizedNextQuestion)
      if (similarity > 0.75) {
        console.log(`[submit-user-answer] High similarity repetition detected (${Math.round(similarity * 100)}%): "${existingQ}" vs "${nextQuestion}"`)
        return true
      }
      
      // Semantic similarity check
      if (areQuestionsSemanticallySimilar(existingQ, nextQuestion)) {
        console.log(`[submit-user-answer] Semantic repetition detected: "${existingQ}" vs "${nextQuestion}"`)
        return true
      }
      
      return false
    })
    
    if (hasInvalidFormat || isRepeatedQuestion || isVagueQuestion) {
      let issueType = 'invalid format'
      if (isRepeatedQuestion) issueType = 'repeated question'
      else if (isVagueQuestion) issueType = 'vague question'
      
      console.log(`[submit-user-answer] Detected ${issueType}: "${nextQuestion}"`)
      
      let correctiveInstructions = ''
      let correctiveUserPrompt = ''
      
      if (isRepeatedQuestion) {
        correctiveInstructions = 'You repeated a question that was already asked. You must ask a completely new and different question.'
        correctiveUserPrompt = 'You repeated a question. Generate a completely NEW yes/no question that has never been asked before.'
      } else if (isVagueQuestion) {
        correctiveInstructions = `You asked a VAGUE question: "${nextQuestion}". Vague questions are not allowed. You must ask CONCRETE, SPECIFIC yes/no questions that people can answer definitively.`
        correctiveUserPrompt = `Your question was too VAGUE. Generate a CONCRETE, SPECIFIC yes/no question instead. For example:
        ❌ VAGUE: "Does it have unique characteristics?"
        ✅ CONCRETE: "Are they from Europe?"
        ❌ VAGUE: "Is it from a specific region?"  
        ✅ CONCRETE: "Are they from Asia?"
        Generate a specific, concrete question now.`
      } else {
        correctiveInstructions = 'Questions must be simple YES/NO format only. Never use "or", never present multiple options.'
        correctiveUserPrompt = 'Regenerate as a proper yes/no question without "or" or multiple options.'
      }
      
      const correctiveSystemPrompt = `${enhancedSystemPrompt}\n\nIMPORTANT: Your previous question had an issue (${issueType}). ${correctiveInstructions} Regenerate as a simple, single-property yes/no question that has never been asked before.`
        
      llmResponse = await llmProvider.generateResponse({
        messages: [{ role: 'user', content: correctiveUserPrompt }],
        systemPrompt: correctiveSystemPrompt,
        temperature: 0.1, // Low temperature for corrective questions
        maxTokens: 100
      })
      nextQuestion = llmResponse.content
      console.log(`[submit-user-answer] Corrected ${issueType}: "${nextQuestion}"`)
    }
    
    // Removed guess validation - LLM can guess whenever it wants, user controls wins via button
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
    return EdgeFunctionBase.createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)