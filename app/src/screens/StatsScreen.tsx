/**
 * Statistics screen displaying player performance analytics and game history.
 * Features category breakdowns, performance metrics, and recent game summaries.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { statsService } from '../services/statsService';
import { PlayerStats, GameSummary, CategoryStats } from '../types/types';

type StatsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Stats'>;

type Props = {
  navigation: StatsScreenNavigationProp;
  route: {
    params: {
      userId: string;
    };
  };
};

/**
 * Main stats screen component that displays comprehensive player analytics.
 * Fetches and renders performance data including win rates, category breakdowns, and game history.
 */
export default function StatsScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches player statistics from the API.
   * Handles loading states and error scenarios.
   */
  const fetchStats = async (forceRefresh: boolean = false) => {
    try {
      setError(null);
      const playerStats = await statsService.getPlayerStats(
        userId,
        10, // recent games limit
        undefined, // no search term
        forceRefresh
      );
      setStats(playerStats);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  /**
   * Handles pull-to-refresh functionality.
   * Clears cache and fetches fresh data.
   */
  const onRefresh = () => {
    setRefreshing(true);
    statsService.clearCache(userId);
    fetchStats(true);
  };

  /**
   * Renders a loading spinner while data is being fetched.
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Renders error state with retry option.
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setLoading(true);
            fetchStats(true);
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Renders empty state when user has no games.
   */
  if (!stats || stats.total_games === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No Games Yet</Text>
          <Text style={styles.emptyText}>
            Start playing to see your statistics!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryButtonText}>Start a Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Statistics</Text>
          <Text style={styles.subtitle}>
            {stats.total_games} game{stats.total_games !== 1 ? 's' : ''} played
          </Text>
        </View>

        {/* Overall Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.highlightValue]}>
                {stats.overall_win_rate}%
              </Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avg_questions_per_game}</Text>
              <Text style={styles.statLabel}>Avg Questions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avg_hints_per_game}</Text>
              <Text style={styles.statLabel}>Avg Hints</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favorite_category}</Text>
              <Text style={styles.statLabel}>Favorite</Text>
            </View>
          </View>
        </View>

        {/* Playing Style Insight */}
        {stats.playing_style_insight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>💡</Text>
            <Text style={styles.insightText}>{stats.playing_style_insight}</Text>
          </View>
        )}

        {/* Category Breakdown */}
        {stats.category_breakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Performance by Category</Text>
            {stats.category_breakdown.map((category: CategoryStats) => (
              <CategoryStatsRow key={category.category} stats={category} />
            ))}
          </View>
        )}

        {/* Recent Games */}
        {stats.recent_games.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Games</Text>
            {stats.recent_games.map((game: GameSummary) => (
              <GameSummaryRow key={game.id} game={game} />
            ))}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Component that renders a single category's statistics row.
 */
function CategoryStatsRow({ stats }: { stats: CategoryStats }) {
  const winRateColor = stats.win_rate >= 70 ? '#4CAF50' : stats.win_rate >= 50 ? '#FF9800' : '#F44336';

  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{stats.category}</Text>
        <Text style={[styles.categoryWinRate, { color: winRateColor }]}>
          {stats.win_rate}% win rate
        </Text>
      </View>
      <View style={styles.categoryDetails}>
        <Text style={styles.categoryDetailText}>
          {stats.games_played} games • {stats.games_won}W - {stats.games_lost}L
        </Text>
        <Text style={styles.categoryDetailText}>
          Avg: {stats.avg_questions_used} questions, {stats.avg_hints_used} hints
        </Text>
      </View>
    </View>
  );
}

/**
 * Component that renders a single game summary row.
 */
function GameSummaryRow({ game }: { game: GameSummary }) {
  const statusEmoji = game.status === 'won' ? '✅' : game.status === 'lost' ? '❌' : '⏸️';
  const statusColor = game.status === 'won' ? '#4CAF50' : game.status === 'lost' ? '#F44336' : '#9E9E9E';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.gameRow}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameCategory}>{game.category}</Text>
        <Text style={styles.gameDate}>{formatDate(game.created_at)}</Text>
      </View>
      <View style={styles.gameDetails}>
        <Text style={styles.gameSecret}>🎯 {game.secret_item}</Text>
        <View style={styles.gameStats}>
          <Text style={[styles.gameStatus, { color: statusColor }]}>
            {statusEmoji} {game.status.toUpperCase()}
          </Text>
          <Text style={styles.gameMetrics}>
            {game.questions_asked} questions • {game.hints_used} hints
          </Text>
        </View>
      </View>
      {game.first_interaction && (
        <Text style={styles.gameFirstQuestion} numberOfLines={2}>
          "{game.first_interaction}"
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  highlightValue: {
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  insightCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: '#1565C0',
    lineHeight: 22,
  },
  categoryRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  categoryWinRate: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryDetails: {
    marginLeft: 4,
  },
  categoryDetailText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  gameRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gameCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  gameDate: {
    fontSize: 12,
    color: '#999',
  },
  gameDetails: {
    marginBottom: 6,
  },
  gameSecret: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  gameMetrics: {
    fontSize: 12,
    color: '#666',
  },
  gameFirstQuestion: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
