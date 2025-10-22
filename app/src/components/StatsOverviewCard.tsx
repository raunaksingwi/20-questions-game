import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

interface StatsOverviewCardProps {
  loading: boolean;
  error?: string | null;
  onRefresh?: (event?: GestureResponderEvent) => void;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    averageQuestions: number;
    topCategory?: string;
    recentCategories: string[];
    lastPlayedAt?: string;
  } | null;
}

/**
 * Lightweight dashboard card for surfacing recent play activity.
 * Displays a quick rollup that helps new users understand their streak at a glance.
 */
export const StatsOverviewCard: React.FC<StatsOverviewCardProps> = ({
  loading,
  error,
  onRefresh,
  stats,
}) => {
  const lastPlayedLabel = useMemo(() => {
    if (!stats?.lastPlayedAt) return 'Never played';

    const lastPlayed = new Date(stats.lastPlayedAt);
    const now = Date.now();
    const diffMinutes = Math.round((now - lastPlayed.getTime()) / 60000);

    if (Number.isNaN(diffMinutes)) {
      return 'Recently';
    }
    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }, [stats?.lastPlayedAt]);

  const winRateLabel = useMemo(() => {
    if (!stats || stats.totalGames === 0) return '0%';
    return `${Math.round((stats.wins / stats.totalGames) * 100)}%`;
  }, [stats]);

  const recentCategories = stats?.recentCategories ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Activity</Text>
          <Text style={styles.caption}>Track how your sessions are going</Text>
        </View>
        {onRefresh ? (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={loading}>
            <Text style={styles.refreshText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#6366f1" />
          <Text style={styles.loadingText}>Loading player trends…</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {!loading && !error && stats ? (
        <>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalGames}</Text>
              <Text style={styles.statLabel}>Total games</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{winRateLabel}</Text>
              <Text style={styles.statLabel}>Win rate</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.averageQuestions}</Text>
              <Text style={styles.statLabel}>Avg questions</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Top category</Text>
              <Text style={styles.metaValue}>{stats.topCategory ?? '—'}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Last played</Text>
              <Text style={styles.metaValue}>{lastPlayedLabel}</Text>
            </View>
          </View>

          {recentCategories.length > 0 ? (
            <View style={styles.categoriesContainer}>
              <Text style={styles.metaLabel}>Recently played</Text>
              <View style={styles.categoryPills}>
                {recentCategories.map((category) => (
                  <View key={category} style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f9fafb',
  },
  caption: {
    fontSize: 13,
    color: '#e5e7eb',
    marginTop: 2,
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  refreshText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#e0e7ff',
    fontSize: 13,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#22d3ee',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 4,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryPill: {
    backgroundColor: '#1f2937',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '500',
  },
});

