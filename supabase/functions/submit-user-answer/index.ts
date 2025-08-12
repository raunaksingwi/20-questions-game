import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SubmitUserAnswerRequest, SubmitUserAnswerResponse } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'

// Initialize shared Supabase client
const supabase = EdgeFunctionBase.initialize()

const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const requestStart = Date.now()
    const { session_id, answer, answer_type }: SubmitUserAnswerRequest = await req.json()
    console.log(`[submit-user-answer] Processing answer: "${answer}" (${answer_type})`)

    // Get session data and conversation history
    const { data: session, error: sessionError } = await supabase
      .from('games')
      .select('id, category, questions_asked, status')
      .eq('id', session_id)
      .eq('mode', 'think')
      .single()

    if (sessionError || !session) {
      throw new Error('Think mode session not found')
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

    const currentQuestionCount = session.questions_asked + 1
    
    // Store user's answer
    const msgStart = Date.now()
    await supabase
      .from('game_messages')
      .insert({
        game_id: session_id,
        role: 'user',
        content: answer,
        message_type: 'answer',
        question_number: currentQuestionCount,
        created_at: new Date().toISOString()
      })
    console.log(`[submit-user-answer] User answer stored in ${Date.now() - msgStart}ms`)

    // Check if we've reached the 20 question limit
    if (currentQuestionCount >= 20) {
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
    conversationContext += `A${currentQuestionCount}: ${answer}\n`

    const systemPrompt = `You are playing 20 Questions in Think mode. The user has thought of an item within the category: ${session.category}.
Your job is to ask up to 20 yes/no questions to identify the item. Rules:
- Ask exactly one yes/no question per turn.
- Keep each question short and unambiguous.
- Stay strictly within the category.
- Use the user's answers to narrow down quickly.
- You may ask a yes/no confirmation like "Is it <specific item>?" when confident.
- Do not reveal internal reasoning. Do not output multiple questions at once.
- Stop asking after 20 questions; await result.
Current question count: ${currentQuestionCount + 1} of 20.
Output only the next yes/no question.

${conversationContext}`

    const userPrompt = `Based on my previous answers, ask your next yes/no question (question ${currentQuestionCount + 1}).`

    const llmResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemPrompt,
      temperature: 0.7,
      maxTokens: 200
    })
    const nextQuestion = llmResponse.content
    console.log(`[submit-user-answer] Next question generated in ${Date.now() - llmStart}ms`)

    // Store LLM's next question and update game state
    const updateStart = Date.now()
    await Promise.all([
      supabase
        .from('game_messages')
        .insert({
          game_id: session_id,
          role: 'assistant',
          content: nextQuestion,
          message_type: 'question',
          question_number: currentQuestionCount + 1,
          created_at: new Date().toISOString()
        }),
      supabase
        .from('games')
        .update({ 
          questions_asked: currentQuestionCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id)
    ])
    console.log(`[submit-user-answer] Updates completed in ${Date.now() - updateStart}ms`)

    const responseData: SubmitUserAnswerResponse = {
      next_question: nextQuestion,
      questions_asked: currentQuestionCount + 1,
      questions_remaining: 20 - (currentQuestionCount + 1),
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