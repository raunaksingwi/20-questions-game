import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MakeGuessRequest, MakeGuessResponse } from '../../../shared/types.ts'

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
    const { game_id, guess }: MakeGuessRequest = await req.json()

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!game) throw new Error('Game not found')
    if (game.status !== 'active') throw new Error('Game is already finished')

    // Normalize strings for comparison
    const normalizedGuess = guess.toLowerCase().trim()
    const normalizedSecret = game.secret_item.toLowerCase().trim()
    
    // Check if guess is correct (allow for minor variations)
    const isCorrect = normalizedGuess === normalizedSecret ||
                     normalizedGuess === `a ${normalizedSecret}` ||
                     normalizedGuess === `an ${normalizedSecret}` ||
                     normalizedGuess === `the ${normalizedSecret}` ||
                     `a ${normalizedGuess}` === normalizedSecret ||
                     `an ${normalizedGuess}` === normalizedSecret ||
                     `the ${normalizedGuess}` === normalizedSecret

    const newStatus = isCorrect ? 'won' : 'lost'
    
    // Save guess message
    await supabase
      .from('game_messages')
      .insert([
        {
          game_id: game_id,
          role: 'user',
          content: `My guess is: ${guess}`,
          message_type: 'guess',
          question_number: game.questions_asked + 1
        }
      ])

    // Update game status
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', game_id)

    if (updateError) throw updateError

    let message: string
    if (isCorrect) {
      message = `Congratulations! You guessed it! The answer was "${game.secret_item}". You won in ${game.questions_asked} questions${game.hints_used > 0 ? ` and used ${game.hints_used} hint${game.hints_used > 1 ? 's' : ''}` : ''}!`
    } else {
      message = `Sorry, that's not correct. The answer was "${game.secret_item}". Better luck next time!`
    }

    const responseData: MakeGuessResponse = {
      correct: isCorrect,
      secret_item: game.secret_item,
      game_status: newStatus,
      message
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})