import { supabase } from './supabase'
import { 
  StartGameRequest, 
  StartGameResponse, 
  AskQuestionRequest, 
  AskQuestionResponse,
  GetHintRequest,
  GetHintResponse,
  Game,
  GameMessage
} from '../../../shared/types'

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`

class GameService {
  // Cache for categories to avoid unnecessary API calls
  private categoriesCache: any[] | null = null;
  private categoriesCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private async callFunction<T, R>(functionName: string, data: T): Promise<R> {
    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Function call failed')
    }

    return response.json()
  }

  async startGame(category?: string): Promise<StartGameResponse> {
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
  }

  async askQuestion(gameId: string, question: string): Promise<AskQuestionResponse> {
    const request: AskQuestionRequest = {
      game_id: gameId,
      question
    }
    return this.callFunction<AskQuestionRequest, AskQuestionResponse>('ask-question', request)
  }

  async getHint(gameId: string): Promise<GetHintResponse> {
    const request: GetHintRequest = {
      game_id: gameId
    }
    return this.callFunction<GetHintRequest, GetHintResponse>('get-hint', request)
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
    try {
      // Check if cache is valid
      const now = Date.now();
      if (this.categoriesCache && (now - this.categoriesCacheTimestamp) < this.CACHE_DURATION) {
        return this.categoriesCache;
      }
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        // Return cached data if available, even if stale
        return this.categoriesCache || []
      }

      // Update cache
      this.categoriesCache = data || [];
      this.categoriesCacheTimestamp = now;
      
      return this.categoriesCache;
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Return cached data if available, even if stale
      return this.categoriesCache || []
    }
  }
  
  // Method to invalidate categories cache if needed
  invalidateCategoriesCache() {
    this.categoriesCache = null;
    this.categoriesCacheTimestamp = 0;
  }

}

export const gameService = new GameService()