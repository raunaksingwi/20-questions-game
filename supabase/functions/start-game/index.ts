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
    const { category, user_id }: StartGameRequest = await req.json()
    console.log(`[start-game] Starting game with category: ${category || 'random'}`)

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

    // Let LLM pick any item from the category
    const gameStart = Date.now()
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id,
        secret_item: '', // Will be set after LLM picks
        category: selectedCategory,
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
    const systemPrompt = promptTemplate.generateItemSelection(categoryData.sample_items)
    console.log(`[start-game] Item selection prompt generated in ${Date.now() - promptStart}ms`)

    // Call OpenAI to let LLM pick an item
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.8,
        max_tokens: 50
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const secretItem = openaiData.choices[0]?.message?.content?.trim() || ''
    
    if (!secretItem) {
      throw new Error('Failed to get item selection from LLM')
    }

    // Update game with the selected item
    const { error: updateError } = await supabase
      .from('games')
      .update({ secret_item: secretItem })
      .eq('id', game.id)

    if (updateError) throw updateError

    // Create the main game prompt with the selected item
    const gamePrompt = promptTemplate.generate(secretItem)
    console.log(`[start-game] Game prompt generated in ${Date.now() - promptStart}ms`)

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