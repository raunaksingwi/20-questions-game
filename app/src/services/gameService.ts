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
  GameMessage
} from '../../../shared/types'
import { optimizedRequest } from '../utils/performanceOptimizer'

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`

class GameService {
  // Cache for categories to avoid unnecessary API calls
  private categoriesCache: any[] | null = null;
  private categoriesCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - longer cache
  private categoriesPromise: Promise<any[]> | null = null; // Promise deduplication
  
  private async callFunction<T, R>(functionName: string, data: T): Promise<R> {
    const startTime = Date.now()
    console.log(`[gameService] Calling ${functionName}...`)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      console.error(`[gameService] ${functionName} request timed out after 10s`)
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
      console.log(`[gameService] ${functionName} completed in ${duration}ms`)

      if (!response.ok) {
        const error = await response.json()
        console.error(`[gameService] ${functionName} failed:`, error)
        throw new Error(error.error || 'Function call failed')
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeout)
      const duration = Date.now() - startTime
      console.error(`[gameService] ${functionName} failed after ${duration}ms:`, error)
      throw error
    }
  }

  async startGame(category?: string): Promise<StartGameResponse> {
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
        user_id
      }
      return this.callFunction<StartGameRequest, StartGameResponse>('start-game', request)
    })
  }

  async askQuestion(gameId: string, question: string): Promise<AskQuestionResponse> {
    return optimizedRequest('ask-question', async () => {
      const request: AskQuestionRequest = {
        game_id: gameId,
        question
      }
      return this.callFunction<AskQuestionRequest, AskQuestionResponse>('ask-question', request)
    })
  }

  async getHint(gameId: string): Promise<GetHintResponse> {
    const request: GetHintRequest = {
      game_id: gameId
    }
    return this.callFunction<GetHintRequest, GetHintResponse>('get-hint', request)
  }

  async quitGame(gameId: string): Promise<QuitGameResponse> {
    const request: QuitGameRequest = {
      game_id: gameId
    }
    return this.callFunction<QuitGameRequest, QuitGameResponse>('quit-game', request)
  }


  async getGame(gameId: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('Error fetching game:', error)
      return null
    }

    return data
  }

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
      .order('name')

    if (error) {
      console.error('Error fetching categories from DB:', error)
      // Return cached data if available, even if stale
      return this.categoriesCache || []
    }

    // Update cache
    this.categoriesCache = data || [];
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

}

export const gameService = new GameService()