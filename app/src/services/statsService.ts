/**
 * Service class that handles all player statistics API calls to Supabase edge functions.
 * Provides methods for fetching and analyzing player performance data.
 */
import { supabase } from './supabase';
import {
  GetPlayerStatsRequest,
  GetPlayerStatsResponse,
  PlayerStats
} from '../types/types';

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

class StatsService {
  // Cache for player stats to reduce unnecessary API calls
  private statsCache: Map<string, { stats: PlayerStats; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  private pendingRequests: Map<string, Promise<GetPlayerStatsResponse>> = new Map();

  /**
   * Generic method to call Supabase edge functions with timeout and error handling.
   * Provides consistent API call pattern with automatic retry logic.
   */
  private async callFunction<T, R>(functionName: string, data: T): Promise<R> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const isRetry = attempt > 0;

      if (isRetry) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
        console.log(`[statsService] Retrying ${functionName} (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`[statsService] Calling ${functionName}...`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        console.error(`[statsService] ${functionName} request timed out after 10s (attempt ${attempt + 1})`);
      }, 10000); // 10s timeout

      try {
        const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        if (!response.ok) {
          const error = await response.json();
          console.error(`[statsService] ${functionName} failed (attempt ${attempt + 1}):`, error);

          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(error.error || 'Function call failed');
          }

          // Retry on 5xx errors (server errors) or network issues
          if (attempt === maxRetries) {
            throw new Error(error.error || 'Function call failed after retries');
          }
          continue; // Retry
        }

        console.log(`[statsService] ${functionName} completed in ${duration}ms${isRetry ? ` (succeeded on attempt ${attempt + 1})` : ''}`);
        return response.json();

      } catch (error) {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        // Check if it's a network error that should be retried
        const isNetworkError = error instanceof TypeError ||
                              (error as any).name === 'AbortError' ||
                              (error as any).message?.includes('network') ||
                              (error as any).message?.includes('fetch');

        console.error(`[statsService] ${functionName} error after ${duration}ms (attempt ${attempt + 1}):`, {
          name: (error as any).name,
          message: (error as any).message,
          isNetworkError
        });

        // If it's the last attempt or a non-network error, throw
        if (attempt === maxRetries || !isNetworkError) {
          throw error;
        }
        // Otherwise, continue to next retry
      }
    }

    throw new Error('Function call failed after all retries');
  }

  /**
   * Fetches comprehensive player statistics for a given user.
   * Implements caching to reduce API calls for frequently accessed data.
   *
   * @param userId - The ID of the user to fetch statistics for
   * @param recentGamesLimit - Optional limit for number of recent games to return (default: 10)
   * @param searchTerm - Optional search term for finding similar games
   * @param forceRefresh - Force cache bypass and fetch fresh data
   * @returns Promise resolving to player statistics
   */
  async getPlayerStats(
    userId: string,
    recentGamesLimit: number = 10,
    searchTerm?: string,
    forceRefresh: boolean = false
  ): Promise<PlayerStats> {
    // Create cache key based on all parameters
    const cacheKey = `${userId}-${recentGamesLimit}-${searchTerm || ''}`;

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = this.statsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('[statsService] Returning cached player stats');
        return cached.stats;
      }
    }

    // Check for pending request to avoid duplicate calls
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log('[statsService] Reusing pending request for player stats');
      const response = await pendingRequest;
      return response.stats;
    }

    // Create new request
    const request = this.callFunction<GetPlayerStatsRequest, GetPlayerStatsResponse>(
      'get-player-stats',
      {
        user_id: userId,
        recent_games_limit: recentGamesLimit,
        search_term: searchTerm
      }
    );

    // Store pending request
    this.pendingRequests.set(cacheKey, request);

    try {
      const response = await request;

      // Cache the result
      this.statsCache.set(cacheKey, {
        stats: response.stats,
        timestamp: Date.now()
      });

      return response.stats;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Clears the stats cache for a specific user or all users.
   * Useful after a game is completed to ensure fresh data.
   *
   * @param userId - Optional user ID to clear cache for. If not provided, clears all cache.
   */
  clearCache(userId?: string): void {
    if (userId) {
      // Clear all cache entries for this user
      const keysToDelete: string[] = [];
      this.statsCache.forEach((_, key) => {
        if (key.startsWith(userId)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.statsCache.delete(key));
      console.log(`[statsService] Cleared cache for user ${userId}`);
    } else {
      // Clear entire cache
      this.statsCache.clear();
      console.log('[statsService] Cleared all stats cache');
    }
  }

  /**
   * Gets cache statistics for debugging.
   *
   * @returns Object with cache size and pending requests count
   */
  getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.statsCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const statsService = new StatsService();
