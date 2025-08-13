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
      name: 'Cricketers',
      sample_items: ['Virat Kohli', 'MS Dhoni', 'Rohit Sharma', 'Joe Root', 'Steve Smith'],
    },
    {
      id: '2',
      name: 'Animals',
      sample_items: ['dog', 'cat', 'elephant', 'lion', 'tiger'],
    },
    {
      id: '3',
      name: 'Food',
      sample_items: ['pizza', 'burger', 'pasta', 'salad', 'soup'],
    },
    {
      id: '4',
      name: 'Objects',
      sample_items: ['chair', 'computer', 'phone', 'book', 'car'],
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
        expect(getByText('Cricketers')).toBeTruthy();
        expect(getByText('Animals')).toBeTruthy();
        expect(getByText('Food')).toBeTruthy();
        expect(getByText('Objects')).toBeTruthy();
      });
    });

    it('should not initialize audio manager on mount (audio removed)', async () => {
      render(<HomeScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockedAudioManager.initialize).not.toHaveBeenCalled();
      });
    });

    it('should display loading state while fetching categories', () => {
      mockedGameService.getCategories = jest.fn(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      // Should show header and skeleton instead of ActivityIndicator
      expect(getByText('Welcome to 20 Questions!')).toBeTruthy();
      expect(getByText('Choose a Category')).toBeTruthy();
    });

    it('should handle category loading error gracefully', async () => {
      mockedGameService.getCategories = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<HomeScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[HomeScreen] Error loading categories:',
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
          getByText('AI picks a secret - I ask questions to guess it!')
        ).toBeTruthy();
      });
    });

    it('should display game rules', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText("How to Play I'm Guessing Mode")).toBeTruthy();
        expect(getByText(/AI picks a secret from the chosen category/)).toBeTruthy();
        expect(getByText(/Ask yes\/no questions to narrow it down/)).toBeTruthy();
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
        // Cricketers category should show examples
        expect(getByText('Examples: Virat Kohli, MS Dhoni, Rohit Sharma...')).toBeTruthy();
        
        // Animals category should show examples
        expect(getByText('Examples: dog, cat, elephant...')).toBeTruthy();
        
        // Food category should show examples
        expect(getByText('Examples: pizza, burger, pasta...')).toBeTruthy();
        
        // Objects category should show examples
        expect(getByText('Examples: chair, computer, phone...')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Game screen when category is selected', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Cricketers')).toBeTruthy();
      });

      const cricketersButton = getByText('Cricketers');
      fireEvent.press(cricketersButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Cricketers',
        mode: 'user_guessing',
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
        mode: 'user_guessing',
      });

      // Test Objects category
      fireEvent.press(getByText('Objects'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Objects',
        mode: 'user_guessing',
      });
    });
  });

  describe('Category Display', () => {
    it('should display all categories returned by the service', async () => {
      const customCategories: Category[] = [
        {
          id: '1',
          name: 'Cricketers',
          sample_items: ['Virat Kohli', 'MS Dhoni', 'Rohit Sharma'],
        },
        {
          id: '2',
          name: 'Objects',
          sample_items: ['chair', 'table', 'lamp'],
        },
      ];

      mockedGameService.getCategories = jest.fn().mockResolvedValue(customCategories);

      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Cricketers')).toBeTruthy();
        expect(getByText('Objects')).toBeTruthy();
        expect(getByText('Examples: Virat Kohli, MS Dhoni, Rohit Sharma...')).toBeTruthy();
        expect(getByText('Examples: chair, table, lamp...')).toBeTruthy();
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
        expect(queryByText('Cricketers')).toBeNull();
        expect(queryByText('Animals')).toBeNull();
        expect(queryByText('Food')).toBeNull();
        expect(queryByText('Objects')).toBeNull();
      });
    });
  });
});