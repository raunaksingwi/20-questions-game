import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { QuitGameRequest, QuitGameResponse } from '../../../shared/types.ts'

// Create Supabase client once outside the handler for connection reuse
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  global: { headers: { 'x-statement-timeout': '5s' } }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { game_id }: QuitGameRequest = await req.json()

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!game) throw new Error('Game not found')

    // Update game status to lost (quit counts as a loss)
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: 'lost',
        updated_at: new Date().toISOString()
      })
      .eq('id', game_id)

    if (updateError) throw updateError

    const responseData: QuitGameResponse = {
      message: `You have left the game. The answer was "${game.secret_item}".`,
      secret_item: game.secret_item
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
}

// Export handler for tests
export default handler

// Start server
serve(handler)