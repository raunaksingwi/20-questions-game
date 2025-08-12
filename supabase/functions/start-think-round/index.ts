import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { StartThinkRoundRequest, StartThinkRoundResponse } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'

// Initialize shared Supabase client
const supabase = EdgeFunctionBase.initialize()

const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const requestStart = Date.now()
    const { category, user_id }: StartThinkRoundRequest = await req.json()
    console.log(`[start-think-round] Starting Think mode session with category: ${category}`)

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

    // Create think session (using games table with mode='think')
    const sessionStart = Date.now()
    const { data: session, error: sessionError } = await supabase
      .from('games')
      .insert({
        user_id,
        secret_item: null, // User will think of this
        category: selectedCategory,
        mode: 'think',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, category, status, created_at')
      .single()
    console.log(`[start-think-round] Session created in ${Date.now() - sessionStart}ms`)

    if (sessionError) throw sessionError

    // Generate LLM's first question using Think mode prompting
    const llmStart = Date.now()
    const llmProvider = EdgeFunctionBase.getLLMProvider('start-think-round')
    
    const systemPrompt = `You are playing 20 Questions in Think mode. The user has thought of an item within the category: ${selectedCategory}.
Your job is to ask up to 20 yes/no questions to identify the item. Rules:
- Ask exactly one yes/no question per turn.
- Keep each question short and unambiguous.
- Stay strictly within the category.
- Use the user's answers to narrow down quickly.
- You may ask a yes/no confirmation like "Is it <specific item>?" when confident.
- Do not reveal internal reasoning. Do not output multiple questions at once.
- Stop asking after 20 questions; await result.
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