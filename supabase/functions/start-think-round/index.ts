import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { StartThinkRoundRequest, StartThinkRoundResponse, isValidCategory, isValidString, isValidUUID } from '../../../shared/types.ts'
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
    
    const { category, user_id }: StartThinkRoundRequest = body
    
    // Validate required fields
    if (!category || !isValidString(category, 1, 50)) {
      throw new Error('Invalid category: must be a non-empty string with max 50 characters')
    }
    
    // Validate user_id if provided
    if (user_id !== undefined && user_id !== null) {
      if (!isValidString(user_id, 1, 100) && !isValidUUID(user_id)) {
        throw new Error('Invalid user_id: must be a valid string or UUID')
      }
    }
    
    console.log(`[start-think-round] Starting AI Guessing mode session with category: ${category}`)

    // Get available categories
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (categoryError) throw categoryError

    // Select category
    let selectedCategory = category
    let categoryData = categories.find(c => c.name === category)
    
    if (!categoryData) {
      // Random category if not specified or invalid
      categoryData = categories[Math.floor(Math.random() * categories.length)]
      selectedCategory = categoryData.name
    }

    // Create AI guessing session (using games table with mode='ai_guessing')
    const sessionStart = Date.now()
    const { data: session, error: sessionError } = await supabase
      .from('games')
      .insert({
        user_id,
        secret_item: null, // User will think of this
        category: selectedCategory,
        mode: 'ai_guessing',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, category, status, created_at')
      .single()
    console.log(`[start-think-round] Session created in ${Date.now() - sessionStart}ms`)

    if (sessionError) {
      console.error('[start-think-round] Database error creating session:', sessionError)
      throw new Error(`Failed to create game session: ${sessionError.message}`)
    }
    
    if (!session?.id) {
      throw new Error('Failed to create game session: no session ID returned')
    }

    // Generate LLM's first question using Think mode prompting
    const llmStart = Date.now()
    const llmProvider = EdgeFunctionBase.getLLMProvider('start-think-round')
    
    const systemPrompt = `You are playing 20 Questions in AI Guessing mode. The user has thought of an item within the category: ${selectedCategory}.
Your job is to ask up to 20 yes/no questions to identify the item. 

Questioning Strategy:
- Start with BROAD categorical questions to divide the category into major groups
- Gradually narrow down based on previous answers - don't jump to specific items too early
- Use a logical hierarchy: general properties → specific properties → final guesses
- Each question should eliminate roughly half of the remaining possibilities
- Build upon what you've learned from previous questions

Rules:
- Ask exactly one yes/no question per turn
- Keep each question short and unambiguous
- Stay strictly within the category
- Use the user's answers to systematically narrow down the possibilities
- Only ask specific item confirmations when you've narrowed it down significantly
- Do not reveal internal reasoning or ask multiple questions at once
- Stop asking after 20 questions; await result

Current question count: 1 of 20.
Output only the next yes/no question.`

    const userPrompt = `I have thought of an item within the category: ${selectedCategory}. Ask your first yes/no question.`

    const llmResponse = await llmProvider.generateResponse({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemPrompt,
      temperature: 0.7,
      maxTokens: 200
    })
    const firstQuestion = llmResponse.content
    console.log(`[start-think-round] First question generated in ${Date.now() - llmStart}ms`)

    // Store the system prompt and first question
    const msgStart = Date.now()
    await supabase
      .from('game_messages')
      .insert([
        {
          game_id: session.id,
          role: 'system',
          content: systemPrompt,
          message_type: 'question',
          question_number: 0,
          created_at: new Date().toISOString()
        },
        {
          game_id: session.id,
          role: 'assistant',
          content: firstQuestion,
          message_type: 'question',
          question_number: 1,
          created_at: new Date().toISOString()
        }
      ])
    console.log(`[start-think-round] Messages stored in ${Date.now() - msgStart}ms`)

    const responseData: StartThinkRoundResponse = {
      session_id: session.id,
      category: selectedCategory,
      first_question: firstQuestion
    }
    
    const totalTime = Date.now() - requestStart
    console.log(`[start-think-round] Total request completed in ${totalTime}ms`)

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error)
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)