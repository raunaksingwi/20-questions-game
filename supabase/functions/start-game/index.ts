import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { StartGameRequest, StartGameResponse } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'
import { PromptTemplateFactory } from '../_shared/prompts/PromptTemplate.ts'

// Initialize shared Supabase client
const supabase = EdgeFunctionBase.initialize()

const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const requestStart = Date.now()
    const { category, mode = 'user_guessing', user_id }: StartGameRequest = await req.json()
    console.log(`[start-game] Starting game with category: ${category || 'random'}, mode: ${mode}`)

    // Get available categories with caching headers
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .order('name') // Ensure consistent ordering

    if (categoryError) throw categoryError

    // Select category
    let selectedCategory = category
    let categoryData = categories.find(c => c.name === category)
    
    if (!categoryData) {
      // Random category if not specified or invalid
      categoryData = categories[Math.floor(Math.random() * categories.length)]
      selectedCategory = categoryData.name
    }

    // Select random item from category
    const secretItem: string = categoryData.sample_items[
      Math.floor(Math.random() * categoryData.sample_items.length)
    ]

    // Create game with optimized query
    const gameStart = Date.now()
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id,
        secret_item: secretItem,
        category: selectedCategory,
        mode: mode,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, category, status, created_at')
      .single()
    console.log(`[start-game] Game created in ${Date.now() - gameStart}ms`)

    if (gameError) throw gameError

    // Create category-specific system message using template
    const promptStart = Date.now()
    const promptTemplate = PromptTemplateFactory.createTemplate(selectedCategory)
    const gamePrompt = promptTemplate.generate(secretItem)
    console.log(`[start-game] Prompt generated in ${Date.now() - promptStart}ms`)

    const msgStart = Date.now()
    const { error: msgError } = await supabase
      .from('game_messages')
      .insert({
        game_id: game.id,
        role: 'system',
        content: gamePrompt,
        message_type: 'question',
        question_number: 0,
        created_at: new Date().toISOString()
      })
      .select('id')
    console.log(`[start-game] System message created in ${Date.now() - msgStart}ms`)

    if (msgError) throw msgError

    const responseData: StartGameResponse = {
      game_id: game.id,
      category: selectedCategory,
      message: `Let's play 20 Questions! I'm thinking of something in the ${selectedCategory} category. You have 20 questions to guess what it is. Ask yes/no questions!`
    }
    
    const totalTime = Date.now() - requestStart
    console.log(`[start-game] Total request completed in ${totalTime}ms`)

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error)
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)