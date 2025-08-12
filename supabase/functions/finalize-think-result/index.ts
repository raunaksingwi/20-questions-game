import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { FinalizeThinkResultRequest, FinalizeThinkResultResponse } from '../../../shared/types.ts'
import { EdgeFunctionBase } from '../_shared/common/EdgeFunctionBase.ts'

// Initialize shared Supabase client
const supabase = EdgeFunctionBase.initialize()

const handler = async (req: Request) => {
  const corsResponse = EdgeFunctionBase.handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const requestStart = Date.now()
    const { session_id, result }: FinalizeThinkResultRequest = await req.json()
    console.log(`[finalize-think-result] Finalizing session with result: ${result}`)

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('games')
      .select('id, category, questions_asked, status, secret_item')
      .eq('id', session_id)
      .eq('mode', 'think')
      .single()

    if (sessionError || !session) {
      throw new Error('Think mode session not found')
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active')
    }

    // Update game status based on result
    const gameStatus = result === 'llm_win' ? 'won' : 'lost' // 'won' means LLM won
    
    const updateStart = Date.now()
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: gameStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
    console.log(`[finalize-think-result] Session updated in ${Date.now() - updateStart}ms`)

    if (updateError) throw updateError

    // Create final message to mark the end of the conversation
    const msgStart = Date.now()
    const finalMessage = result === 'llm_win' 
      ? "Great! I successfully guessed what you were thinking of!"
      : "I couldn't guess it in 20 questions. Well played!"

    await supabase
      .from('game_messages')
      .insert({
        game_id: session_id,
        role: 'assistant',
        content: finalMessage,
        message_type: 'answer', // Final response
        question_number: session.questions_asked + 1,
        created_at: new Date().toISOString()
      })
    console.log(`[finalize-think-result] Final message stored in ${Date.now() - msgStart}ms`)

    const responseData: FinalizeThinkResultResponse = {
      message: result === 'llm_win' 
        ? `I guessed it in ${session.questions_asked} questions!`
        : `I couldn't guess it in ${session.questions_asked} questions. What were you thinking of?`,
      questions_used: session.questions_asked,
      // Don't expose secret_item in Think mode - user thought of it
      secret_item: result === 'llm_loss' ? undefined : session.secret_item
    }
    
    const totalTime = Date.now() - requestStart
    console.log(`[finalize-think-result] Total request completed in ${totalTime}ms`)

    return EdgeFunctionBase.createSuccessResponse(responseData)

  } catch (error) {
    return EdgeFunctionBase.createErrorResponse(error)
  }
}

// Export handler for tests
export default handler

// Start server
serve(handler)