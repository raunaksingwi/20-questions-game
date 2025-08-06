import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_HINTS_PER_GAME = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { game_id }: GetHintRequest = await req.json()

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!game) throw new Error('Game not found')
    if (game.status !== 'active') throw new Error('Game is not active')

    // Check hint limit
    if (game.hints_used >= MAX_HINTS_PER_GAME) {
      throw new Error(`You've already used all ${MAX_HINTS_PER_GAME} hints!`)
    }

    // Get conversation history
    const { data: messages, error: msgError } = await supabase
      .from('game_messages')
      .select('*')
      .eq('game_id', game_id)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    // Prepare hint request
    const chatMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Add hint request with context - include conversation history for consistency
    const hintPrompt = `Based on our conversation so far about the secret item, provide a helpful hint that:

CRITICAL REQUIREMENTS:
- MUST be consistent with all previous answers you've given
- Review the conversation to ensure no contradictions
- Don't reveal the answer directly
- Helps narrow down the possibilities appropriately

Context:
- This is hint #${game.hints_used + 1} out of ${MAX_HINTS_PER_GAME}
- We're on question #${game.questions_asked + 1}
- The secret item is: ${game.secret_item}

Guidelines for hint specificity:
${game.questions_asked < 5 ? 'Give a general category or broad property hint.' : ''}
${game.questions_asked >= 5 && game.questions_asked < 10 ? 'Give a hint about its characteristics or properties.' : ''}
${game.questions_asked >= 10 && game.questions_asked < 15 ? 'Give a more specific hint about its features or usage.' : ''}
${game.questions_asked >= 15 ? 'Give a strong hint about context, usage, or where it\'s commonly found.' : ''}

IMPORTANT: 
1. Review all previous answers to ensure consistency
2. The hint should help without contradicting previous answers
3. Respond with ONLY the hint text - no JSON, no formatting, no extra text

Examples of good hints:
- "It's something you'd find in most kitchens"
- "People use this to stay organized" 
- "It's made primarily of metal and plastic"
- "You'd typically use this outdoors"

Provide only the hint text, nothing else.`

    chatMessages.push({
      role: 'user',
      content: hintPrompt
    })

    // Call Anthropic Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: chatMessages.filter(msg => msg.role !== 'system').map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        system: chatMessages.find(msg => msg.role === 'system')?.content,
        temperature: 0.7,
        max_tokens: 100
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get hint from Claude')
    }

    const data = await response.json()
    const rawHint = data.content[0].text

    // Parse hint response in case LLM returns JSON format
    let hint
    try {
      // Try to extract JSON from the response (in case LLM adds JSON format)
      const jsonMatch = rawHint.match(/\{[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // If it's JSON, extract the answer or any text field
        hint = parsed.answer || parsed.hint || parsed.text || rawHint;
      } else {
        hint = rawHint;
      }
    } catch (error) {
      // If parsing fails, use the raw text
      hint = rawHint;
    }

    // Clean up the hint text
    hint = hint.replace(/^(Hint:|Answer:)\s*/i, '').trim()

    // Save hint message using upsert to prevent duplicates
    const questionNumber = game.questions_asked + 1
    await supabase
      .from('game_messages')
      .upsert([
        {
          game_id: game_id,
          role: 'user',
          content: 'I need a hint!',
          message_type: 'hint',
          question_number: questionNumber
        },
        {
          game_id: game_id,
          role: 'assistant',
          content: hint,
          message_type: 'hint',
          question_number: questionNumber
        }
      ])

    // Update game hints count AND questions count (hint costs a question)
    const newQuestionsAsked = game.questions_asked + 1
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        hints_used: game.hints_used + 1,
        questions_asked: newQuestionsAsked,
        updated_at: new Date().toISOString()
      })
      .eq('id', game_id)

    if (updateError) throw updateError

    // Check if game should end due to no more questions
    const gameStatus = newQuestionsAsked >= 20 ? 'lost' : 'active'
    if (gameStatus === 'lost') {
      await supabase
        .from('games')
        .update({ status: 'lost' })
        .eq('id', game_id)
      
      // Delete game data in background after response is sent
      setTimeout(async () => {
        try {
          // Delete messages first (due to foreign key constraint)
          await supabase
            .from('game_messages')
            .delete()
            .eq('game_id', game_id)
          
          // Then delete the game
          await supabase
            .from('games')
            .delete()
            .eq('id', game_id)
        } catch (error) {
          console.error('Failed to cleanup game data:', error)
        }
      }, 1000) // 1 second delay to ensure response is sent first
    }

    const responseData: GetHintResponse = {
      hint,
      hints_remaining: MAX_HINTS_PER_GAME - game.hints_used - 1,
      questions_remaining: 20 - newQuestionsAsked,
      game_status: gameStatus
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