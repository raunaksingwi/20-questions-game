// Mock the shared types module first
jest.mock('../../../../shared/types', () => ({}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { gameService } from '../../services/gameService';
import { audioManager } from '../../services/AudioManager';

// Define types locally for testing
interface Category {
  id: string;
  name: string;
  sample_items: string[];
}

jest.mock('../../services/gameService');
jest.mock('../../services/AudioManager');

const mockedGameService = gameService as jest.Mocked<typeof gameService>;
const mockedAudioManager = audioManager as jest.Mocked<typeof audioManager>;

describe('HomeScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockCategories: Category[] = [
    {
      id: '1',
      name: 'Animals',
      sample_items: ['dog', 'cat', 'elephant', 'lion', 'tiger'],
    },
    {
      id: '2',
      name: 'Food',
      sample_items: ['pizza', 'burger', 'pasta', 'salad', 'soup'],
    },
    {
      id: '3',
      name: 'Random',
      sample_items: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAudioManager.initialize = jest.fn().mockResolvedValue(undefined);
    mockedGameService.getCategories = jest.fn().mockResolvedValue(mockCategories);
  });

  describe('Initialization', () => {
    it('should load categories on mount', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(mockedGameService.getCategories).toHaveBeenCalled();
        expect(getByText('Animals')).toBeTruthy();
        expect(getByText('Food')).toBeTruthy();
        expect(getByText('Random')).toBeTruthy();
      });
    });

    it('should initialize audio manager on mount', async () => {
      render(<HomeScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockedAudioManager.initialize).toHaveBeenCalled();
      });
    });

    it('should display loading state while fetching categories', () => {
      mockedGameService.getCategories = jest.fn(
        () => new Promise(() => {}) // Never resolves
      );

      const { UNSAFE_getByType } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      expect(() => UNSAFE_getByType(require('react-native').ActivityIndicator)).not.toThrow();
    });

    it('should handle category loading error gracefully', async () => {
      mockedGameService.getCategories = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<HomeScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading categories:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('UI Elements', () => {
    it('should display welcome message', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Welcome to 20 Questions!')).toBeTruthy();
        expect(
          getByText("I'll think of something from your chosen category - try to guess it!")
        ).toBeTruthy();
      });
    });

    it('should display game rules', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('How to Play')).toBeTruthy();
        expect(getByText(/I'll think of something from the chosen category/)).toBeTruthy();
        expect(getByText(/Ask me yes\/no questions to narrow it down/)).toBeTruthy();
        expect(getByText(/You have 20 questions to guess correctly/)).toBeTruthy();
        expect(getByText(/You can request up to 3 hints/)).toBeTruthy();
        expect(getByText(/Make your final guess when you think you know!/)).toBeTruthy();
      });
    });

    it('should display category descriptions correctly', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        // Animals category should show examples
        expect(getByText('Examples: dog, cat, elephant...')).toBeTruthy();
        
        // Food category should show examples
        expect(getByText('Examples: pizza, burger, pasta...')).toBeTruthy();
        
        // Random category should show special message
        expect(getByText('I can think of anything!')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Game screen when category is selected', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Animals')).toBeTruthy();
      });

      const animalsButton = getByText('Animals');
      fireEvent.press(animalsButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Animals',
      });
    });

    it('should navigate with correct category for each option', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Food')).toBeTruthy();
      });

      // Test Food category
      fireEvent.press(getByText('Food'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Food',
      });

      // Test Random category
      fireEvent.press(getByText('Random'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Random',
      });
    });
  });

  describe('Category Display', () => {
    it('should display all categories returned by the service', async () => {
      const customCategories: Category[] = [
        {
          id: '1',
          name: 'Objects',
          sample_items: ['chair', 'table', 'lamp'],
        },
        {
          id: '2',
          name: 'Places',
          sample_items: ['park', 'beach', 'mountain'],
        },
      ];

      mockedGameService.getCategories = jest.fn().mockResolvedValue(customCategories);

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Objects')).toBeTruthy();
        expect(getByText('Places')).toBeTruthy();
        expect(getByText('Examples: chair, table, lamp...')).toBeTruthy();
        expect(getByText('Examples: park, beach, mountain...')).toBeTruthy();
      });
    });

    it('should handle empty categories list', async () => {
      mockedGameService.getCategories = jest.fn().mockResolvedValue([]);

      const { getByText, queryByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Choose a Category')).toBeTruthy();
        // No category buttons should be displayed
        expect(queryByText('Animals')).toBeNull();
        expect(queryByText('Food')).toBeNull();
      });
    });
  });
});