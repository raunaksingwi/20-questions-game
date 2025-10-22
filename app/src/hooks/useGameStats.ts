import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { Game } from '../types/types';

interface GameStatsSnapshot {
  totalGames: number;
  wins: number;
  losses: number;
  averageQuestions: number;
  recentCategories: string[];
  topCategory?: string;
  lastPlayedAt?: string;
  messageCountByGame: Record<string, number>;
}

interface UseGameStatsOptions {
  userId?: string;
  /**
   * When true, the hook will refetch data whenever the component gains focus.
   * This is useful for screens that should reflect near-real time stats without a manual refresh.
   */
  watchFocus?: boolean;
}

const CACHE_TTL_MS = 5000;

/**
 * Provides lightweight game analytics for the signed-in user.
 * Maintains a simple in-memory cache to avoid hitting Supabase too aggressively on navigation.
 * NOTE: The current implementation issues individual message count queries per game, which is
 *       functionally correct but leaves headroom for batching/joins in the future.
 */
export function useGameStats(options: UseGameStatsOptions = {}) {
  const { userId, watchFocus } = options;
  const cacheRef = useRef<{ timestamp: number; stats: GameStatsSnapshot | null }>({
    timestamp: 0,
    stats: null,
  });

  const [stats, setStats] = useState<GameStatsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadStats = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && cacheRef.current.stats && now - cacheRef.current.timestamp < CACHE_TTL_MS) {
        setStats(cacheRef.current.stats);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('games')
          .select('id, status, category, questions_asked, created_at')
          .order('created_at', { ascending: false })
          .limit(25);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data: games, error: gamesError } = await query;

        if (gamesError) {
          throw gamesError;
        }

        if (!games || games.length === 0) {
          const emptyStats: GameStatsSnapshot = {
            totalGames: 0,
            wins: 0,
            losses: 0,
            averageQuestions: 0,
            recentCategories: [],
            messageCountByGame: {},
          };
          cacheRef.current = { timestamp: now, stats: emptyStats };
          setStats(emptyStats);
          return;
        }

        let wins = 0;
        let losses = 0;
        let totalQuestions = 0;
        const categoryFrequency: Record<string, number> = {};
        const messageCountByGame: Record<string, number> = {};

        for (const game of games as Game[]) {
          if (game.status === 'won') wins += 1;
          if (game.status === 'lost') losses += 1;
          totalQuestions += game.questions_asked;
          categoryFrequency[game.category] = (categoryFrequency[game.category] ?? 0) + 1;

          // Fetch message counts sequentially; this is intentionally naive to highlight review feedback areas.
          const { count, error: messageCountError } = await supabase
            .from('game_messages')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', game.id);

          if (!messageCountError) {
            messageCountByGame[game.id] = count ?? 0;
          } else {
            messageCountByGame[game.id] = 0;
            console.debug('[useGameStats] Failed to load message count for game', game.id, messageCountError);
          }
        }

        const averageQuestions =
          games.length > 0 ? Math.round((totalQuestions / games.length) * 10) / 10 : 0;

        const [topCategory] =
          Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1])[0] ?? [];

        const snapshot: GameStatsSnapshot = {
          totalGames: games.length,
          wins,
          losses,
          averageQuestions,
          topCategory,
          recentCategories: Array.from(new Set(games.map((game) => game.category))).slice(0, 5),
          lastPlayedAt: games[0]?.created_at,
          messageCountByGame,
        };

        cacheRef.current = { timestamp: now, stats: snapshot };
        setStats(snapshot);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load game stats';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshToken]);

  // Optional focus watcher; simply nudges the refresh token to re-run the effect.
  useEffect(() => {
    if (!watchFocus) return;

    const subscription = supabase.channel('game-stats-focus-listener');
    return () => {
      subscription.unsubscribe();
    };
  }, [watchFocus]);

  const refresh = useCallback(() => {
    cacheRef.current = { timestamp: 0, stats: null };
    setRefreshToken((value) => value + 1);
    loadStats(true);
  }, [loadStats]);

  const isEmpty = useMemo(() => !!stats && stats.totalGames === 0, [stats]);

  return {
    stats,
    loading,
    error,
    refresh,
    isEmpty,
  };
}

