import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SubmitUserAnswerRequest, SubmitUserAnswerResponse, isValidUUID, isValidString, isValidAnswerType } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { DecisionTree } from '../_shared/logic/DecisionTree.ts'
import { AIQuestioningTemplateFactory } from '../_shared/prompts/AIQuestioningTemplate.ts'
import { AIGuessingPromptBuilder } from '../_shared/prompts/AIGuessingPromptBuilder.ts'

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
    

    // Build categorized summary using the new prompt builder
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

    // Use the prompt builder to categorize facts
    const facts = AIGuessingPromptBuilder.categorizeFacts(questionsByNumber, answersByNumber)
    
    // Build list of all asked questions
    const allAskedQuestions: string[] = []
    Object.keys(questionsByNumber)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .forEach(n => {
        const q = questionsByNumber[n]
        if (q) allAskedQuestions.push(q)
      })
    
    // Also track the question that's about to be generated to prevent immediate repetition
    const recentQuestions = messages
      .filter(msg => msg.role === 'assistant' && msg.question_number && msg.question_number > 0)
      .slice(-3) // Check last 3 questions for immediate repetition
      .map(msg => msg.content)

    const totalQuestionsUsed = questionsCountedForLimit
    
    // Build proper conversation history by pairing questions with answers
    const conversationHistory: Array<{question: string, answer: string}> = []
    
    // Group messages by question number to create proper Q&A pairs
    const messagesByQuestionNumber: Record<number, {question?: string, answer?: string}> = {}
    messages.forEach(msg => {
      if (msg.question_number && msg.question_number > 0) {
        if (!messagesByQuestionNumber[msg.question_number]) {
          messagesByQuestionNumber[msg.question_number] = {}
        }
        if (msg.role === 'assistant') {
          messagesByQuestionNumber[msg.question_number].question = msg.content
        } else if (msg.role === 'user') {
          messagesByQuestionNumber[msg.question_number].answer = msg.content
        }
      }
    })
    
    // Convert to conversation history array, only including complete Q&A pairs
    Object.keys(messagesByQuestionNumber)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .forEach(questionNum => {
        const pair = messagesByQuestionNumber[questionNum]
        if (pair.question && pair.answer) {
          conversationHistory.push({
            question: pair.question,
            answer: pair.answer
          })
        }
      })
    
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
    
    // Get analytical insights from DecisionTree - no question generation
    let decisionAnalysis
    try {
      decisionAnalysis = DecisionTree.analyzeConversationState(
        session.category,
        conversationHistory,
        categoryItems
      )
      console.log(`[submit-user-answer] Analysis: ${decisionAnalysis.insights.remainingCount} candidates remaining, guessing phase: ${decisionAnalysis.shouldEnterGuessingPhase}`)
    } catch (error) {
      console.warn('[submit-user-answer] Decision tree analysis failed:', error)
      decisionAnalysis = null
    }
    
    // Use the AI questioning template system
    const aiQuestioningTemplate = AIQuestioningTemplateFactory.createTemplate(session.category)
    const baseSystemPrompt = aiQuestioningTemplate.generate(
      totalQuestionsUsed,
      conversationContext,
      allAskedQuestions
    )
    
    // Use the prompt builder to create enhanced system prompt
    // Build enhanced system prompt with analytical insights (no hardcoded questions)
    const enhancedSystemPrompt = AIGuessingPromptBuilder.buildEnhancedSystemPrompt(
      baseSystemPrompt,
      session.category,
      facts,
      allAskedQuestions,
      currentQuestionNumber
    )

    // Create user prompt with analytical context
    let userPrompt = `Ask your next strategic yes/no question that eliminates about half the remaining possibilities.`
    
    if (decisionAnalysis) {
      const { shouldEnterGuessingPhase, insights } = decisionAnalysis
      
      if (shouldEnterGuessingPhase && insights.topCandidates.length > 0) {
        userPrompt = `Based on analysis, you should now make specific guesses. Top candidates: ${insights.topCandidates.slice(0, 3).join(', ')}. Ask: "Is it [specific name]?"`
      } else if (insights.suggestedFocus.length > 0) {
        userPrompt = `${userPrompt} Focus analysis suggests exploring: ${insights.suggestedFocus.join(', ')}.`
      }
    }

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
      /particular details/i,
      /famous/i,
      /well-known/i,
      /significance/i,
      /important/i,
      /generally/i,
      /typically/i,
      /usually/i,
      /commonly/i,
      /mostly/i,
      /often/i,
      /frequently/i,
      /normally/i,
      /average/i,
      /standard/i,
      /regular/i,
      /ordinary/i,
      /common\?$/i, // "Is it common?" at end
      /popular\?$/i, // "Is it popular?" at end
      /useful\?$/i, // "Is it useful?" at end
      /good\?$/i, // "Is it good?" at end
      /bad\?$/i, // "Is it bad?" at end
      /expensive\?$/i, // "Is it expensive?" at end
      /cheap\?$/i, // "Is it cheap?" at end
      /complex\?$/i, // "Is it complex?" at end
      /simple\?$/i, // "Is it simple?" at end
      /obvious\?$/i // "Is it obvious?" at end
    ]
    
    const hasInvalidFormat = invalidPatterns.some(pattern => pattern.test(nextQuestion))
    const isVagueQuestion = vaguePatterns.some(pattern => pattern.test(nextQuestion))
    
    // Enhanced question repetition detection with semantic similarity
    const normalizeQuestion = (q: string) => {
      return q.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(is|it|a|an|the|does|do|can|will|would|are|they|have|has|did|was|were|this|that|these|those|he|she|him|her|his|hers|their|them)\b/g, '') // Remove common question words
        .replace(/\b(currently|still|now|today|recently|often|usually|typically|generally|commonly|mostly|primarily|mainly)\b/g, '') // Remove temporal/frequency modifiers
        .replace(/\b(very|really|quite|rather|pretty|fairly|extremely|incredibly|highly|slightly|somewhat)\b/g, '') // Remove intensity modifiers
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
        // Size/Scale variations
        ['size', 'big', 'large', 'small', 'tiny', 'huge', 'massive', 'enormous', 'gigantic', 'mini', 'microscopic', 'bigger', 'smaller', 'larger'],
        
        // Life/Death variations
        ['alive', 'living', 'life', 'dead', 'deceased', 'extinct', 'exist', 'existence', 'mortality'],
        
        // Gender variations  
        ['male', 'female', 'man', 'woman', 'gender', 'boy', 'girl', 'masculine', 'feminine'],
        
        // Geography/Location variations
        ['country', 'nation', 'nationality', 'from', 'region', 'area', 'place', 'location', 'where', 'continent', 'geography', 'geographic'],
        ['europe', 'european', 'asia', 'asian', 'africa', 'african', 'america', 'american', 'australia', 'australian'],
        
        // Leadership/Political roles
        ['president', 'leader', 'prime minister', 'head', 'ruler', 'king', 'queen', 'monarch', 'dictator', 'emperor', 'political', 'government'],
        
        // Time/Era variations
        ['time', 'era', 'period', 'century', 'decade', 'when', 'before', 'after', 'during', 'recent', 'historical', 'modern', 'ancient'],
        
        // Color/Appearance
        ['color', 'coloured', 'colored', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'appearance', 'looks', 'colored'],
        
        // Technology/Electronics
        ['electronic', 'digital', 'technology', 'tech', 'computer', 'machine', 'device', 'gadget', 'electric', 'powered'],
        
        // Animal classification
        ['mammal', 'animal', 'creature', 'species', 'bird', 'reptile', 'fish', 'insect', 'wildlife', 'fauna'],
        
        // Food/Diet
        ['food', 'eat', 'edible', 'consume', 'diet', 'carnivore', 'herbivore', 'omnivore', 'nutrition'],
        
        // Home/Domestic
        ['house', 'home', 'domestic', 'household', 'indoor', 'kitchen', 'bedroom', 'bathroom', 'living room'],
        
        // Material/Composition
        ['material', 'made', 'metal', 'wood', 'plastic', 'glass', 'fabric', 'stone', 'composed', 'constructed'],
        
        // Function/Use/Purpose
        ['use', 'function', 'purpose', 'tool', 'instrument', 'equipment', 'work', 'utility', 'designed'],
        
        // Activity status (for athletes/people)
        ['active', 'current', 'retired', 'former', 'still', 'playing', 'serving', 'career'],
        
        // Achievement/Success
        ['won', 'champion', 'award', 'prize', 'famous', 'successful', 'achievement', 'accomplished', 'victory'],
        
        // Animal-specific traits
        ['wild', 'domestic', 'pet', 'tame', 'feral', 'captive'],
        ['legs', 'limbs', 'appendages', 'body parts'],
        ['fly', 'flight', 'flying', 'aerial', 'wings'],
        ['swim', 'swimming', 'aquatic', 'water', 'marine'],
        
        // Sports-specific
        ['team', 'club', 'franchise', 'organization'],
        ['championship', 'title', 'trophy', 'cup', 'medal'],
        ['position', 'role', 'plays', 'player']
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
    const allQuestionsToCheck = [...allAskedQuestions, ...recentQuestions]
    const isRepeatedQuestion = allQuestionsToCheck.some(existingQ => {
      const normalizedExisting = normalizeQuestion(existingQ)
      
      // Exact match after normalization
      if (normalizedExisting === normalizedNextQuestion) {
        console.log(`[submit-user-answer] Exact repetition detected: "${existingQ}" vs "${nextQuestion}"`)
        return true
      }
      
      // High similarity match (lowered threshold to 70% for better detection)
      const similarity = calculateSimilarity(normalizedExisting, normalizedNextQuestion)
      if (similarity > 0.70) {
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