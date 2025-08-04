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
    let secretItem: string
    if (categoryData.name === 'Random') {
      // For random category, select from all other categories
      const allItems = categories
        .filter(c => c.name !== 'Random')
        .flatMap(c => c.sample_items)
      secretItem = allItems[Math.floor(Math.random() * allItems.length)]
    } else {
      secretItem = categoryData.sample_items[
        Math.floor(Math.random() * categoryData.sample_items.length)
      ]
    }

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

Rules:
1. Answer questions with only "Yes", "No", or "Sometimes" (use Sometimes sparingly, only when truly applicable)
2. Be accurate but don't volunteer extra information
3. If asked for a hint, provide a subtle clue that narrows down possibilities without revealing the answer
4. Hints should be progressively more helpful based on the number of questions asked
5. Never directly state what the item is in hints

IMPORTANT - Guess Detection:
You must also determine if the user's question is actually a guess of the specific item rather than a general question.

Examples of GUESSES (specific items):
- "Is it a dog?" (when asking about a specific animal)
- "Is it a bicycle?" (when asking about a specific object)  
- "Is it pizza?" (when asking about a specific food)

Examples of QUESTIONS (categories/properties):
- "Is it an animal?" (broad category)
- "Is it something you ride?" (property/usage)
- "Is it bigger than a car?" (comparison)

Response format: CRITICAL - Only respond with this exact JSON structure, no extra text:
{"answer": "Yes/No/Sometimes", "is_guess": true/false, "game_over": true/false}

Rules for JSON response:
- If is_guess = true AND the guess matches "${secretItem}" (or close synonyms), set game_over = true and answer = "Yes"
- If is_guess = true BUT the guess is wrong, set answer = "No" and game_over = false  
- If is_guess = false, answer normally ("Yes"/"No"/"Sometimes") and set game_over = false

IMPORTANT: Return ONLY the JSON, no conversational text before or after.

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