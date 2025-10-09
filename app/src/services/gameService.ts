/**
 * Service class that handles all game-related API calls to Supabase edge functions.
 * Provides methods for game lifecycle, questions, hints, and AI interactions.
 */
import { supabase } from './supabase'
import { 
  StartGameRequest, 
  StartGameResponse, 
  AskQuestionRequest, 
  AskQuestionResponse,
  GetHintRequest,
  GetHintResponse,
  QuitGameRequest,
  QuitGameResponse,
  Game,
  GameMessage,
  StartThinkRoundRequest,
  StartThinkRoundResponse,
  SubmitUserAnswerRequest,
  SubmitUserAnswerResponse,
  FinalizeThinkResultRequest,
  FinalizeThinkResultResponse
} from '../types/types'
import { optimizedRequest } from '../utils/performanceOptimizer'

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`

class GameService {
  // Cache for categories to avoid unnecessary API calls
  private categoriesCache: any[] | null = null;
  private categoriesCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000;
  private categoriesPromise: Promise<any[]> | null = null;
  private gameCache = new Map<string, { value: Game | null; expiresAt: number }>();
  private readonly GAME_CACHE_TTL = 60 * 1000;
  
  /**
   * Generic method to call Supabase edge functions with timeout and error handling.
   * Provides consistent API call pattern across all game operations with automatic retry logic.
   */
  private async callFunction<T, R>(functionName: string, data: T): Promise<R> {
    const maxRetries = 1;
    const baseDelay = 1500;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now()
      const isRetry = attempt > 0;
      
      if (isRetry) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
        console.log(`[gameService] Retrying ${functionName} (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`[gameService] Calling ${functionName}...`);
      }
      
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
        console.error(`[gameService] ${functionName} request timed out after 10s (attempt ${attempt + 1})`)
      }, 10000) // 10s timeout
      
      try {
        const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        const duration = Date.now() - startTime
        
        if (!response.ok) {
          const error = await response.json()
          console.error(`[gameService] ${functionName} failed (attempt ${attempt + 1}):`, error)
          
          // Don't retry on 4xx errors (client errors) - only network/server errors
          if (response.status >= 400 && response.status < 500) {
            throw new Error(error.error || 'Function call failed')
          }
          
          // Retry on 5xx errors (server errors) or network issues
          if (attempt === maxRetries) {
            throw new Error(error.error || 'Function call failed after retries')
          }
          continue; // Retry
        }

        console.log(`[gameService] ${functionName} completed in ${duration}ms${isRetry ? ` (succeeded on attempt ${attempt + 1})` : ''}`);
        return response.json()
        
      } catch (error) {
        clearTimeout(timeout)
        const duration = Date.now() - startTime
        
        // Check if it's a network error (AbortError, TypeError, etc.) that should be retried
        const isNetworkError = error instanceof TypeError || 
                              (error as any).name === 'AbortError' || 
                              (error as any).code === 'NETWORK_REQUEST_FAILED';
        
        console.error(`[gameService] ${functionName} failed after ${duration}ms (attempt ${attempt + 1}):`, error)
        
        // Don't retry on non-network errors or if we've exhausted retries
        if (!isNetworkError || attempt === maxRetries) {
          throw error
        }
        
        // Continue to next retry attempt
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error(`Unexpected error in ${functionName} after all retries`);
  }

  /**
   * Starts a new game with the specified category and mode.
   * Handles user authentication and falls back to anonymous play if needed.
   */
  async startGame(category?: string, mode?: string): Promise<StartGameResponse> {
    return optimizedRequest('start-game', async () => {
      let user_id: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        user_id = user?.id
      } catch (error) {
        // Continue without user ID if auth fails
        user_id = undefined
      }
      
      const request: StartGameRequest = {
        category,
        mode: mode as any,
        user_id
      }
      return this.callFunction<StartGameRequest, StartGameResponse>('start-game', request)
    })
  }

  /**
   * Submits a question to the game and gets an AI response.
   * Uses request optimization to prevent duplicate calls.
   */
  async askQuestion(gameId: string, question: string): Promise<AskQuestionResponse> {
    return optimizedRequest('ask-question', async () => {
      const request: AskQuestionRequest = {
        game_id: gameId,
        question
      }
      return this.callFunction<AskQuestionRequest, AskQuestionResponse>('ask-question', request)
    })
  }

  /**
   * Requests a hint for the current game.
   * Returns contextual clues based on conversation history.
   */
  async getHint(gameId: string): Promise<GetHintResponse> {
    const request: GetHintRequest = {
      game_id: gameId
    }
    return this.callFunction<GetHintRequest, GetHintResponse>('get-hint', request)
  }

  /**
   * Quits the current game and reveals the secret item.
   * Ends the game session and provides the answer.
   */
  async quitGame(gameId: string): Promise<QuitGameResponse> {
    const request: QuitGameRequest = {
      game_id: gameId
    }
    return this.callFunction<QuitGameRequest, QuitGameResponse>('quit-game', request)
  }


  /**
   * Retrieves game data by ID from the database.
   * Returns null if the game is not found or an error occurs.
   */
  async getGame(gameId: string): Promise<Game | null> {
    const now = Date.now();
    const cached = this.gameCache.get(gameId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('Error fetching game:', error)
      this.gameCache.set(gameId, { value: null, expiresAt: now + this.GAME_CACHE_TTL })
      return null
    }

    this.gameCache.set(gameId, { value: data, expiresAt: now + this.GAME_CACHE_TTL })
    return data
  }

  /**
   * Retrieves all messages for a specific game in chronological order.
   * Returns empty array if no messages found or an error occurs.
   */
  async getGameMessages(gameId: string): Promise<GameMessage[]> {
    const { data, error } = await supabase
      .from('game_messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  }

  async getCategories() {
    return optimizedRequest('get-categories', async () => {
      try {
        // Check if cache is valid
        const now = Date.now();
        if (this.categoriesCache && (now - this.categoriesCacheTimestamp) < this.CACHE_DURATION) {
          console.log('[gameService] Categories served from cache');
          return this.categoriesCache;
        }
        
        // Deduplicate concurrent requests
        if (this.categoriesPromise) {
          return this.categoriesPromise;
        }
        
        this.categoriesPromise = this.fetchCategoriesFromDB();
        const result = await this.categoriesPromise;
        this.categoriesPromise = null;
        
        return result;
      } catch (error) {
        this.categoriesPromise = null;
        console.error('Error fetching categories:', error)
        // Return cached data if available, even if stale
        return this.categoriesCache || []
      }
    });
  }
  
  private async fetchCategoriesFromDB() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')

    if (error) {
      console.error('Error fetching categories from DB:', error)
      // Return cached data if available, even if stale
      return this.categoriesCache || []
    }

    const sorted = (data || []).slice().sort((a: any, b: any) => {
      if (typeof a.popularity_score === 'number' && typeof b.popularity_score === 'number' && b.popularity_score !== a.popularity_score) {
        return b.popularity_score - a.popularity_score
      }
      const left = typeof a.name === 'string' ? a.name : ''
      const right = typeof b.name === 'string' ? b.name : ''
      return left.localeCompare(right)
    })
    this.categoriesCache = sorted;
    this.categoriesCacheTimestamp = Date.now();
    
    return this.categoriesCache;
  }
  
  // Method to warm the cache on app startup
  async warmCache() {
    try {
      await this.getCategories();
    } catch (error) {
      console.warn('Failed to warm categories cache:', error);
    }
  }
  
  // Method to invalidate categories cache if needed
  invalidateCategoriesCache() {
    this.categoriesCache = null;
    this.categoriesCacheTimestamp = 0;
  }

  // Think Mode methods
  async startThinkRound(category: string, userId?: string): Promise<StartThinkRoundResponse> {
    return optimizedRequest('start-think-round', async () => {
      let user_id: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        user_id = user?.id || userId
      } catch (error) {
        // Continue without user ID if auth fails
        user_id = userId
      }
      
      const request: StartThinkRoundRequest = {
        category,
        user_id
      }
      return this.callFunction<StartThinkRoundRequest, StartThinkRoundResponse>('start-think-round', request)
    })
  }

  async submitUserAnswer(sessionId: string, answer: string, answerType: 'chip' | 'text' | 'voice'): Promise<SubmitUserAnswerResponse> {
    const request: SubmitUserAnswerRequest = {
      session_id: sessionId,
      answer,
      answer_type: answerType
    }
    return this.callFunction<SubmitUserAnswerRequest, SubmitUserAnswerResponse>('submit-user-answer', request)
  }

  async finalizeThinkResult(sessionId: string, result: 'llm_win' | 'llm_loss'): Promise<FinalizeThinkResultResponse> {
    const request: FinalizeThinkResultRequest = {
      session_id: sessionId,
      result
    }
    return this.callFunction<FinalizeThinkResultRequest, FinalizeThinkResultResponse>('finalize-think-result', request)
  }

}

export const gameService = new GameService()
