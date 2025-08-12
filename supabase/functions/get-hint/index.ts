import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GetHintRequest, GetHintResponse } from '../../../shared/types.ts'
import { LLMConfigLoader, LLMProviderFactory, ResponseParser } from '../_shared/llm/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_HINTS_PER_GAME = 3

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
      const llmConfig = LLMConfigLoader.loadConfig('get-hint')
      llmProvider = LLMProviderFactory.createProvider(llmConfig)
      console.log('✅ LLM provider initialized successfully for get-hint')
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
    const { game_id }: GetHintRequest = await req.json()

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

    // Check hint limit
    if (game.hints_used >= MAX_HINTS_PER_GAME) {
      throw new Error(`You've already used all ${MAX_HINTS_PER_GAME} hints!`)
    }

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

    // Get LLM provider (lazy initialization with caching)
    const provider = getLLMProvider()

    // Call LLM provider
    const llmResponse = await provider.generateResponse({
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 100
    })

    const rawHint = llmResponse.content

    // Parse hint response
    const hint = ResponseParser.parseHintResponse(rawHint)

    // Save hint message and update game in parallel for better performance
    const questionNumber = game.questions_asked + 1
    const newQuestionsAsked = game.questions_asked + 1
    
    const [insertResult, updateResult] = await Promise.all([
      supabase
        .from('game_messages')
        .insert([
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
        ]),
      supabase
        .from('games')
        .update({ 
          hints_used: game.hints_used + 1,
          questions_asked: newQuestionsAsked,
          updated_at: new Date().toISOString()
        })
        .eq('id', game_id)
    ])

    if (insertResult.error) throw insertResult.error
    if (updateResult.error) throw updateResult.error

    // Check if game should end due to no more questions
    const gameStatus = newQuestionsAsked >= 20 ? 'lost' : 'active'
    if (gameStatus === 'lost') {
      await supabase
        .from('games')
        .update({ status: 'lost' })
        .eq('id', game_id)
      
      // Game cleanup is now handled by database triggers
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
}

// Export handler for tests
export default handler

// Start server
serve(handler)