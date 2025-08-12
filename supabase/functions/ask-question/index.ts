import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AskQuestionRequest, AskQuestionResponse } from '../../../shared/types.ts'
import { LLMConfigLoader, LLMProviderFactory, ResponseParser } from '../_shared/llm/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client once outside the handler for connection reuse
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  global: { headers: { 'x-statement-timeout': '5s' } }
})

// Lazy initialization for LLM provider - initialized once but with proper error handling
let llmProvider: any = null
let llmProviderError: string | null = null

const getLLMProvider = () => {
  if (llmProviderError) {
    throw new Error(llmProviderError)
  }
  
  if (!llmProvider) {
    try {
      const llmConfig = LLMConfigLoader.loadConfig('ask-question')
      llmProvider = LLMProviderFactory.createProvider(llmConfig)
      console.log('✅ LLM provider initialized successfully for ask-question')
    } catch (error) {
      llmProviderError = `Failed to initialize LLM provider: ${error.message}`
      console.error('❌ LLM provider initialization failed:', error)
      throw new Error(llmProviderError)
    }
  }
  
  return llmProvider
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { game_id, question }: AskQuestionRequest = await req.json()

    // Get game and messages in a single query for better performance
    const { data, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        game_messages (
          id, role, content, message_type, question_number, created_at
        )
      `)
      .eq('id', game_id)
      .single()

    if (gameError) throw gameError
    if (!data) throw new Error('Game not found')
    if (data.status !== 'active') throw new Error('Game is not active')
    
    const game = data
    const messages = (data.game_messages || []).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

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

    // Messages already fetched in the combined query above

    // Prepare messages for LLM with enhanced context
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))
    
    // Add consistency reminder if there's conversation history
    if (messages.length > 2) { // Only add if there's actual conversation history
      const consistencyReminder = `[CONSISTENCY REMINDER: Review all your previous answers above to ensure this response is consistent with what you've already established about the secret item.]`
      
      chatMessages.push({
        role: 'system',
        content: consistencyReminder
      })
    }
    
    // Add new question
    chatMessages.push({
      role: 'user',
      content: question
    })

    // Get LLM provider (lazy initialization with caching)
    const provider = getLLMProvider()

    // Call LLM provider
    const llmResponse = await provider.generateResponse({
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

    // Determine game status
    let gameStatus: 'active' | 'won' | 'lost' = 'active'
    if (gameWon) {
      gameStatus = 'won'
    } else if (questionNumber >= 20) {
      gameStatus = 'lost'
    }

    // Batch insert messages and update game in parallel for better performance
    const [insertResult, updateResult] = await Promise.all([
      supabase
        .from('game_messages')
        .insert([
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
        ]),
      supabase
        .from('games')
        .update({ 
          questions_asked: questionNumber,
          status: gameStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', game_id)
    ])

    if (insertResult.error) throw insertResult.error
    if (updateResult.error) throw updateResult.error

    // Game cleanup is now handled by database triggers
    // No need for setTimeout - triggers will handle cleanup automatically

    const questionsRemaining = 20 - questionNumber

    const responseData: AskQuestionResponse = {
      answer: gameWon 
        ? `${answer}! You got it! The answer was "${game.secret_item}".`
        : gameStatus === 'lost' 
          ? `${answer} Game over! You've used all 20 questions. The answer was "${game.secret_item}".`
          : answer,
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
}

// Export handler for tests
export default handler

// Start server
serve(handler)