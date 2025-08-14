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
      .select('id, category, questions_asked, status, knowledge_tree')
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
    
    // Add logical deduction helper and domain constraints
    if (yesFacts.length >= 2) {
      categorizedSummary += '\n⚠️  REDUNDANCY CHECK: The item already has ALL of these properties confirmed as TRUE.\n'
      categorizedSummary += 'Do NOT ask about combinations of these confirmed properties.\n'
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
    
    // Generate/update knowledge tree instead of using raw conversation history
    const existingTree = session.knowledge_tree || {}
    const knowledgeTreePrompt = `Update this knowledge tree based on the latest Q&A in the 20 questions game.

CATEGORY: ${session.category}
CURRENT ANSWER: ${answer}
LAST QUESTION: ${messages.filter(m => m.role === 'assistant').pop()?.content || ''}

EXISTING KNOWLEDGE TREE:
${JSON.stringify(existingTree, null, 2)}

ALL Q&A HISTORY (for context):
${conversationContext}

Update the JSON knowledge tree with this structure:
{
  "category": "${session.category}",
  "domain_path": ["General Category", "Subcategory", "Specific Domain"],
  "confirmed_facts": {
    "attribute_group_1": {
      "yes": ["confirmed true facts"],
      "no": ["confirmed false facts"], 
      "maybe": ["uncertain/sometimes facts"],
      "unknown": ["don't know responses"]
    },
    "attribute_group_2": { ... }
  },
  "narrowed_domain": "Current specific domain description",
  "logical_eliminations": ["What has been ruled out"],
  "next_strategic_focus": "What domain aspect to explore next"
}

Group facts by logical categories (geography, size, material, role, era, etc). 
Output ONLY the JSON - no explanations.`

    // Generate knowledge tree
    const treeResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: knowledgeTreePrompt }],
      systemPrompt: 'You are a structured data expert. Create precise, logical knowledge trees.',
      temperature: 0.1,
      maxTokens: 800
    })
    let knowledgeTree = ''
    try {
      // Validate it's valid JSON
      JSON.parse(treeResponse.content)
      knowledgeTree = treeResponse.content
    } catch (error) {
      console.warn('[submit-user-answer] Knowledge tree generation failed, using fallback:', error)
      knowledgeTree = JSON.stringify({
        category: session.category,
        domain_path: [session.category],
        confirmed_facts: {},
        narrowed_domain: `${session.category} category`,
        logical_eliminations: [],
        next_strategic_focus: "Continue systematic questioning"
      })
    }
    
    const systemPrompt = `You are playing 20 Questions to guess an item in the ${session.category} category.

CORE RULE: Ask questions that eliminate about half the remaining possibilities.

CRITICAL DOMAIN NARROWING RULE: 
Use the structured knowledge tree below to understand your current domain constraints.
Your next question MUST stay within the narrowed domain and further subdivide it.
NEVER jump to unrelated properties outside the established domain.

LOGICAL DEDUCTION - If you know:
- "Is it a mammal?" = YES, then you know it's NOT a bird, reptile, or fish
- "Is it living?" = YES, then you know it's NOT electronic, furniture, or objects
- "Is it dead?" = YES, then you know it's NOT alive

AVOID REDUNDANCY:
- DON'T ask about facts already confirmed in the knowledge tree
- DON'T ask compound questions like "Is it big or small?" - pick one

KNOWLEDGE TREE (Structured facts from conversation):
${knowledgeTree}

Question ${totalQuestionsUsed + 1} of 20.

TASK: Based on the knowledge tree above, ask your next strategic yes/no question that further narrows the domain. Focus on the "next_strategic_focus" guidance. Output ONLY the question.`

    const userPrompt = `Based on the knowledge tree, ask your next optimal yes/no question that follows the strategic focus.`

    let llmResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemPrompt,
      temperature: 0.05, // Reduced for more deterministic behavior
      maxTokens: 100 // Reduced since we want just the question
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
            updated_at: new Date().toISOString(),
            knowledge_tree: JSON.parse(knowledgeTree)
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