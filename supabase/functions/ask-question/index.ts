import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'
import { LLMConfigLoader, LLMProviderFactory, ResponseParser } from '../_shared/llm/index.ts'

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
    
    // Initialize LLM provider
    const llmConfig = LLMConfigLoader.loadConfig('ask-question')
    const llmProvider = LLMProviderFactory.createProvider(llmConfig)
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

    // Prepare messages for LLM
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))
    
    // Add new question
    chatMessages.push({
      role: 'user',
      content: question
    })

    // Call LLM provider
    const llmResponse = await llmProvider.generateResponse({
      messages: chatMessages,
      temperature: 0.1,
      maxTokens: 50
    })

    const rawResponse = llmResponse.content

    // Parse the response from LLM
    const parsedResponse = ResponseParser.parseGameResponse(rawResponse)

    const answer = parsedResponse.answer
    const isGuess = parsedResponse.is_guess || false
    const questionNumber = game.questions_asked + 1

    // Game is won if LLM returned is_guess=true (only happens when answer=Yes and correct guess)
    // Additional validation: is_guess should ONLY be true if answer is Yes
    const gameWon = parsedResponse.is_guess === true && answer.toLowerCase().includes('yes')
    
    // Safety validation - log suspicious cases
    ResponseParser.validateGameResponse(parsedResponse, rawResponse, question, game.secret_item)

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