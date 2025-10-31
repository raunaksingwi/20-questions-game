// Mock the shared types module first
jest.mock('../../../../shared/types', () => ({
  GameMode: {
    USER_GUESSING: 'user_guessing',
    AI_GUESSING: 'ai_guessing'
  }
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import StatsScreen from '../StatsScreen';
import { statsService } from '../../services/statsService';
import { PlayerStats } from '../../types/types';

jest.mock('../../services/statsService');

const mockedStatsService = statsService as jest.Mocked<typeof statsService>;

describe('StatsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute = {
    params: {
      userId: 'test-user-123',
    },
  };

  const mockStats: PlayerStats = {
    total_games: 10,
    total_wins: 7,
    total_losses: 3,
    overall_win_rate: 70.0,
    avg_questions_per_game: 12.5,
    avg_hints_per_game: 1.2,
    favorite_category: 'Animals',
    category_breakdown: [
      {
        category: 'Animals',
        games_played: 6,
        games_won: 5,
        games_lost: 1,
        win_rate: 83.3,
        avg_questions_used: 11.0,
        avg_hints_used: 0.8,
      },
      {
        category: 'Objects',
        games_played: 4,
        games_won: 2,
        games_lost: 2,
        win_rate: 50.0,
        avg_questions_used: 14.5,
        avg_hints_used: 1.8,
      },
    ],
    recent_games: [
      {
        id: 'game-1',
        category: 'Animals',
        mode: 'user_guessing' as any,
        status: 'won' as any,
        secret_item: 'Lion',
        questions_asked: 10,
        hints_used: 1,
        created_at: new Date().toISOString(),
        message_count: 22,
        first_interaction: 'Is it a mammal?',
      },
      {
        id: 'game-2',
        category: 'Objects',
        mode: 'user_guessing' as any,
        status: 'lost' as any,
        secret_item: 'Lamp',
        questions_asked: 15,
        hints_used: 2,
        created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        message_count: 32,
        first_interaction: 'Is it electronic?',
      },
    ],
    playing_style_insight: 'Excellent player! You win 70% of games using an average of 13 questions.',
  };

  const emptyStats: PlayerStats = {
    total_games: 0,
    total_wins: 0,
    total_losses: 0,
    overall_win_rate: 0,
    avg_questions_per_game: 0,
    avg_hints_per_game: 0,
    favorite_category: 'None',
    category_breakdown: [],
    recent_games: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading indicator while fetching stats', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockReturnValue(
        new Promise(() => {}) // Never resolves to keep loading state
      );

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Loading your statistics...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message when stats fetching fails', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText(/Network error/)).toBeTruthy();
      });
    });

    it('should allow retry on error', async () => {
      mockedStatsService.getPlayerStats = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockStats);

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText(/Network error/)).toBeTruthy();
      });

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(getByText('Your Statistics')).toBeTruthy();
        expect(mockedStatsService.getPlayerStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when user has no games', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(emptyStats);

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('No Games Yet')).toBeTruthy();
        expect(getByText('Start playing to see your statistics!')).toBeTruthy();
      });
    });

    it('should navigate to Home when "Start a Game" is pressed', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(emptyStats);

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('No Games Yet')).toBeTruthy();
      });

      const startButton = getByText('Start a Game');
      fireEvent.press(startButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
    });
  });

  describe('Stats Display', () => {
    beforeEach(() => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(mockStats);
    });

    it('should display overall statistics', async () => {
      const { getByText, getAllByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('Your Statistics')).toBeTruthy();
        expect(getByText('10 games played')).toBeTruthy();
        expect(getByText('Overall Performance')).toBeTruthy();
        expect(getByText('7')).toBeTruthy(); // Wins
        expect(getByText('3')).toBeTruthy(); // Losses
        expect(getByText('70%')).toBeTruthy(); // Win rate
        expect(getByText('12.5')).toBeTruthy(); // Avg questions
        expect(getByText('1.2')).toBeTruthy(); // Avg hints
        expect(getAllByText('Animals').length).toBeGreaterThan(0); // Favorite category (appears multiple times)
      });
    });

    it('should display playing style insight', async () => {
      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(
          getByText('Excellent player! You win 70% of games using an average of 13 questions.')
        ).toBeTruthy();
      });
    });

    it('should display category breakdown', async () => {
      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('Performance by Category')).toBeTruthy();
        expect(getByText('83.3% win rate')).toBeTruthy(); // Animals win rate
        expect(getByText('50% win rate')).toBeTruthy(); // Objects win rate
        expect(getByText('6 games • 5W - 1L')).toBeTruthy(); // Animals stats
        expect(getByText('4 games • 2W - 2L')).toBeTruthy(); // Objects stats
      });
    });

    it('should display recent games', async () => {
      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('Recent Games')).toBeTruthy();
        expect(getByText('🎯 Lion')).toBeTruthy();
        expect(getByText('🎯 Lamp')).toBeTruthy();
        expect(getByText('✅ WON')).toBeTruthy();
        expect(getByText('❌ LOST')).toBeTruthy();
        expect(getByText('"Is it a mammal?"')).toBeTruthy();
        expect(getByText('"Is it electronic?"')).toBeTruthy();
      });
    });

    it('should format dates correctly', async () => {
      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('Today')).toBeTruthy();
        expect(getByText('Yesterday')).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(mockStats);
      mockedStatsService.clearCache = jest.fn();
    });

    it('should navigate back when back button is pressed', async () => {
      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('Your Statistics')).toBeTruthy();
      });

      const backButton = getByText('← Back to Home');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should support pull-to-refresh', async () => {
      const { getByTestId, UNSAFE_getByType } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(mockedStatsService.getPlayerStats).toHaveBeenCalledTimes(1);
      });

      // Find ScrollView and trigger refresh
      const scrollView = UNSAFE_getByType(require('react-native').ScrollView);
      const refreshControl = scrollView.props.refreshControl;

      // Simulate pull-to-refresh
      refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockedStatsService.clearCache).toHaveBeenCalledWith('test-user-123');
        expect(mockedStatsService.getPlayerStats).toHaveBeenCalledTimes(2);
        expect(mockedStatsService.getPlayerStats).toHaveBeenLastCalledWith(
          'test-user-123',
          10,
          undefined,
          true
        );
      });
    });
  });

  describe('Service Integration', () => {
    it('should call statsService with correct parameters', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(mockStats);

      render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(mockedStatsService.getPlayerStats).toHaveBeenCalledWith(
          'test-user-123',
          10,
          undefined,
          false
        );
      });
    });

    it('should handle different user IDs', async () => {
      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(mockStats);

      const customRoute = {
        params: {
          userId: 'another-user-456',
        },
      };

      render(
        <StatsScreen
          navigation={mockNavigation as any}
          route={customRoute as any}
        />
      );

      await waitFor(() => {
        expect(mockedStatsService.getPlayerStats).toHaveBeenCalledWith(
          'another-user-456',
          10,
          undefined,
          false
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle stats without insight', async () => {
      const statsWithoutInsight = {
        ...mockStats,
        playing_style_insight: undefined,
      };

      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(statsWithoutInsight);

      const { queryByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(queryByText(/Excellent player/)).toBeNull();
      });
    });

    it('should handle games without first_interaction', async () => {
      const statsWithoutInteraction = {
        ...mockStats,
        recent_games: [
          {
            ...mockStats.recent_games[0],
            first_interaction: undefined,
          },
        ],
      };

      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(statsWithoutInteraction);

      const { queryByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(queryByText('"Is it a mammal?"')).toBeNull();
      });
    });

    it('should handle singular "game" text correctly', async () => {
      const singleGameStats = {
        ...mockStats,
        total_games: 1,
      };

      mockedStatsService.getPlayerStats = jest.fn().mockResolvedValue(singleGameStats);

      const { getByText } = render(
        <StatsScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(getByText('1 game played')).toBeTruthy();
      });
    });
  });
});
