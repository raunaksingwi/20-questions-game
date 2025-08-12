import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'
import { LLMConfigLoader, LLMProviderFactory, ResponseParser } from '../_shared/llm/index.ts'

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
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Initialize LLM provider
    const llmConfig = LLMConfigLoader.loadConfig('get-hint')
    const llmProvider = LLMProviderFactory.createProvider(llmConfig)
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

    // Prepare hint request with full conversation context
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))

    // Extract and summarize key information from conversation
    const userQuestions = messages.filter(m => m.role === 'user' && m.message_type === 'question')
    const previousHints = messages.filter(m => m.role === 'assistant' && m.message_type === 'hint')
    const answers = messages.filter(m => m.role === 'assistant' && m.message_type === 'answer')
    
    // Build conversation summary
    let conversationSummary = `[HINT CONTEXT SUMMARY:
- Total questions asked: ${userQuestions.length}
- Previous hints given: ${previousHints.length}
- Current progress: Question #${game.questions_asked + 1} of 20

PREVIOUS HINTS PROVIDED:`

    if (previousHints.length > 0) {
      previousHints.forEach((hint, index) => {
        conversationSummary += `\nHint #${index + 1}: "${hint.content}"`
      })
    } else {
      conversationSummary += `\nNo previous hints given.`
    }

    conversationSummary += `\n\nKEY ANSWERS FROM CONVERSATION:`
    
    // Summarize Yes/No pattern to help generate consistent hints
    const yesAnswers = answers.filter(a => a.content.toLowerCase().includes('yes')).length
    const noAnswers = answers.filter(a => a.content.toLowerCase().includes('no')).length
    conversationSummary += `\n- "Yes" answers: ${yesAnswers}, "No" answers: ${noAnswers}`
    conversationSummary += `\n\nThe conversation above shows what the player already knows about the secret item.]`

    // Add conversation summary
    chatMessages.push({
      role: 'system',
      content: conversationSummary
    })

    // Add hint request with enhanced context
    const hintPrompt = `Based on our conversation so far about the secret item (${game.secret_item}), provide hint #${game.hints_used + 1}:

CRITICAL REQUIREMENTS:
1. MUST be consistent with ALL previous answers - review the entire conversation
2. MUST NOT contradict any previous hints: ${previousHints.map(h => `"${h.content}"`).join(', ') || 'none'}
3. MUST NOT repeat previous hints - provide NEW information each time
4. Should build upon what the player already knows
5. Don't reveal the answer directly
6. Consider what questions haven't been asked yet

HINT PROGRESSION GUIDELINES:
${game.questions_asked < 5 ? '- Early game: Give a general category or broad property hint' : ''}
${game.questions_asked >= 5 && game.questions_asked < 10 ? '- Mid game: Give a hint about specific characteristics or properties' : ''}
${game.questions_asked >= 10 && game.questions_asked < 15 ? '- Late game: Give a more specific hint about features, usage, or context' : ''}
${game.questions_asked >= 15 ? '- Very late game: Give a strong hint that significantly narrows possibilities' : ''}

IMPORTANT: 
- Make the hint helpful based on current progress
- Respond with ONLY the hint text - no JSON, no formatting, no explanations

Provide only the hint text:`

    chatMessages.push({
      role: 'user',
      content: hintPrompt
    })

    // Call LLM provider
    const llmResponse = await llmProvider.generateResponse({
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 100
    })

    const rawHint = llmResponse.content

    // Parse hint response
    const hint = ResponseParser.parseHintResponse(rawHint)

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
      hint: gameStatus === 'lost' ? `${hint} Game over! You've used all 20 questions. The answer was "${game.secret_item}".` : hint,
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