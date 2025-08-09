import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'

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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { game_id, question }: AskQuestionRequest = await req.json()

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!game) throw new Error('Game not found')
    if (game.status !== 'active') throw new Error('Game is not active')

    // Check if game is over
    if (game.questions_asked >= 20) {
      await supabase
        .from('games')
        .update({ status: 'lost' })
        .eq('id', game_id)
      
      // Return proper game over response instead of throwing error
      const responseData: AskQuestionResponse = {
        answer: `Game over! You've used all 20 questions. The answer was "${game.secret_item}".`,
        questions_remaining: 0,
        game_status: 'lost'
      }

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Get conversation history
    const { data: messages, error: msgError } = await supabase
      .from('game_messages')
      .select('*')
      .eq('game_id', game_id)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    // Prepare messages for OpenAI
    const chatMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    
    // Add new question
    chatMessages.push({
      role: 'user',
      content: question
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
        temperature: 0.1,
        max_tokens: 50
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get response from Claude')
    }

    const data = await response.json()
    const rawResponse = data.content[0].text

    // Parse the JSON response from Claude
    let llmResponse
    try {
      // Try to extract JSON from the response (in case LLM adds extra text)
      const jsonMatch = rawResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        llmResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (error) {
      // Fallback if LLM doesn't return proper JSON - extract just the answer portion
      let cleanAnswer = rawResponse.trim()
      let isGuess = false
      
      // Try to extract just the answer from responses like "No, eagle is not a reptile"
      if (cleanAnswer.toLowerCase().startsWith('yes')) {
        cleanAnswer = 'Yes'
        // Check if this might be a winning guess (LLM said Yes but didn't format properly)
        // Look for winning phrases in the raw response
        if (rawResponse.toLowerCase().includes('correct') || 
            rawResponse.toLowerCase().includes('you got it') ||
            rawResponse.toLowerCase().includes('that\'s right') ||
            rawResponse.toLowerCase().includes('exactly')) {
          isGuess = true
        }
      } else if (cleanAnswer.toLowerCase().startsWith('no')) {
        cleanAnswer = 'No'
      } else if (cleanAnswer.toLowerCase().startsWith('sometimes')) {
        cleanAnswer = 'Sometimes'
      } else if (cleanAnswer.toLowerCase().includes('not sure')) {
        cleanAnswer = 'Not sure'
      }
      
      llmResponse = {
        answer: cleanAnswer,
        is_guess: isGuess
      }
    }

    const answer = llmResponse.answer
    const isGuess = llmResponse.is_guess || false
    const questionNumber = game.questions_asked + 1

    // Game is won if LLM returned is_guess=true (only happens when answer=Yes and correct guess)
    // Additional validation: is_guess should ONLY be true if answer is Yes
    const gameWon = llmResponse.is_guess === true && answer.toLowerCase().includes('yes')
    
    // Safety validation - log suspicious cases
    if (llmResponse.is_guess === true && !answer.toLowerCase().includes('yes')) {
      console.error('VALIDATION ERROR: is_guess=true but answer is not Yes:', {
        raw_response: rawResponse,
        parsed_response: llmResponse,
        question: question,
        secret_item: game.secret_item
      })
    }

    // Save question and answer (upsert prevents duplicates)
    await supabase
      .from('game_messages')
      .upsert([
        {
          game_id: game_id,
          role: 'user',
          content: question,
          message_type: isGuess ? 'guess' : 'question',
          question_number: questionNumber
        },
        {
          game_id: game_id,
          role: 'assistant',
          content: answer,
          message_type: 'answer',
          question_number: questionNumber
        }
      ])

    // Determine game status
    let gameStatus: 'active' | 'won' | 'lost' = 'active'
    if (gameWon) {
      gameStatus = 'won'
    } else if (questionNumber >= 20) {
      gameStatus = 'lost'
    }

    // Update game
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        questions_asked: questionNumber,
        status: gameStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', game_id)

    if (updateError) throw updateError

    // If game is over, delete the game and all messages after response is sent
    if (gameStatus === 'won' || gameStatus === 'lost') {
      // Delete in background (don't wait for it to complete the response)
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

    const questionsRemaining = 20 - questionNumber

    const responseData: AskQuestionResponse = {
      answer: gameWon ? `${answer}! You got it! The answer was "${game.secret_item}".` : answer,
      questions_remaining: questionsRemaining,
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