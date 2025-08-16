// Mock the shared types module first
jest.mock('../../../shared/types', () => ({
  GameMode: {
    USER_GUESSING: 'user_guessing',
    AI_GUESSING: 'ai_guessing'
  }
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { audioManager } from '../../services/AudioManager';

jest.mock('../../services/AudioManager');

const mockedAudioManager = audioManager as jest.Mocked<typeof audioManager>;

describe('HomeScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAudioManager.initialize = jest.fn().mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should display hardcoded categories', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      expect(getByText('Animals')).toBeTruthy();
      expect(getByText('Objects')).toBeTruthy();
      expect(getByText('Cricket Players')).toBeTruthy();
      expect(getByText('Football Players')).toBeTruthy();
      expect(getByText('NBA Players')).toBeTruthy();
      expect(getByText('World Leaders')).toBeTruthy();
    });

    it('should not initialize audio manager on mount (audio removed)', async () => {
      render(<HomeScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockedAudioManager.initialize).not.toHaveBeenCalled();
      });
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

  });

  describe('Navigation', () => {
    it('should navigate to Game screen when category is selected', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      const animalsButton = getByText('Animals');
      fireEvent.press(animalsButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Animals',
        mode: 'user_guessing',
      });
    });

    it('should navigate with correct category for each option', async () => {
      const { getByText } = render(
        <HomeScreen navigation={mockNavigation as any} />
      );

      // Test Objects category
      fireEvent.press(getByText('Objects'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Objects',
        mode: 'user_guessing',
      });

      // Test Cricket Players category
      fireEvent.press(getByText('Cricket Players'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Game', {
        category: 'Cricket Players',
        mode: 'user_guessing',
      });
    });
  });

});