import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { StartGameRequest, StartGameResponse } from '../../../shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { category, user_id }: StartGameRequest = await req.json()

    // Get categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')

    if (catError) throw catError

    // Select category and random item
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

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id,
        secret_item: secretItem,
        category: selectedCategory,
        status: 'active'
      })
      .select()
      .single()

    if (gameError) throw gameError

    // Create system message
    const systemPrompt = `You are playing 20 questions. The secret item is: ${secretItem}.

ACCURACY REQUIREMENTS:
- Before answering, think specifically about "${secretItem}" and its exact properties
- For animals: Consider their biology, habitat, diet, anatomy (reptiles vs fish vs mammals)
- For objects: Consider their materials, function, size, how they work
- For food: Consider ingredients, preparation method, origin, how it's served
- Be factually correct about basic classifications

RESPONSE RULES:
1. Answer "Yes/No/Sometimes" based only on the actual properties of "${secretItem}"
2. Use "Yes" for properties that are definitely true for this item
3. Use "No" for properties that are definitely false for this item  
4. Use "Sometimes" for subcategory questions where the item could be included but isn't always. 
5. Use "Not sure" when you are not sure about the answer. When you cannot make a clear distinction between yes and no or sometimes.

GUESS DETECTION:
- ONLY return {"answer": "Yes", "is_guess": true} if asking for the exact item or clear synonym
- Examples of synonyms: eggplant/aubergine, soda/pop, couch/sofa
- Different species are NOT synonyms: snake ≠ python, dog ≠ golden retriever

Examples:
- "Is it a dog?" (secret: dog) → {"answer": "Yes", "is_guess": true} [EXACT match]
- "Is it an animal?" (secret: dog) → {"answer": "Yes"} [Category]
- "Is it a golden retriever?" (secret: dog) → {"answer": "Sometimes"} [Subcategory]
- "Is it a car?" (secret: car) → {"answer": "Yes", "is_guess": true} [EXACT match]  
- "Is it an automobile?" (secret: car) → {"answer": "Yes", "is_guess": true} [Synonym]

RESPONSE FORMAT - CRITICAL:
You must respond with ONLY a JSON object in one of these exact formats:
{"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"} or {"answer": "Not sure"}
OR for correct guesses only:
{"answer": "Yes", "is_guess": true}

Do not include ANY other text. No explanations. No sentences. ONLY the JSON object.

For hints, consider:
- After 5-10 questions: Give general category or property hints
- After 10-15 questions: Give more specific characteristic hints  
- After 15+ questions: Give stronger hints about usage or context

Remember: The goal is to be helpful while maintaining the challenge of the game.`

    const { error: msgError } = await supabase
      .from('game_messages')
      .insert({
        game_id: game.id,
        role: 'system',
        content: systemPrompt,
        message_type: 'question',
        question_number: 0
      })

    if (msgError) throw msgError

    const response: StartGameResponse = {
      game_id: game.id,
      category: selectedCategory,
      message: `Let's play 20 Questions! I'm thinking of something in the ${selectedCategory} category. You have 20 questions to guess what it is. Ask yes/no questions!`
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})