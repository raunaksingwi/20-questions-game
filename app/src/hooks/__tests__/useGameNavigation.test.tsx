import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Platform, Alert } from 'react-native';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback: () => void) => callback()),
}));

// Mock React Native components and APIs
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
  TouchableOpacity: 'TouchableOpacity',
  Text: 'Text',
}));

import { useGameNavigation } from '../useGameNavigation';
import { useFocusEffect } from '@react-navigation/native';

const mockedUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>;
const mockedAlert = Alert as jest.Mocked<typeof Alert>;

// Mock window.confirm for web testing
Object.defineProperty(global, 'window', {
  value: {
    confirm: jest.fn(),
  },
  writable: true,
});

describe('useGameNavigation', () => {
  const mockNavigation = {
    setOptions: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('sets up navigation options with quit button', () => {
    renderHook(() => useGameNavigation(mockNavigation as any));

    expect(mockedUseFocusEffect).toHaveBeenCalled();
    expect(mockNavigation.setOptions).toHaveBeenCalledWith({
      headerRight: expect.any(Function),
    });
  });

  it('calls useFocusEffect with callback function', () => {
    renderHook(() => useGameNavigation(mockNavigation as any));

    // Get the callback passed to useFocusEffect
    const focusEffectCallback = mockedUseFocusEffect.mock.calls[0][0];

    expect(typeof focusEffectCallback).toBe('function');
    expect(mockedUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('creates quit button that shows alert on native platforms', () => {
    Platform.OS = 'ios';
    renderHook(() => useGameNavigation(mockNavigation as any));

    // Get the headerRight function
    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();

    // Simulate press on the quit button
    const onPress = quitButtonElement.props.onPress;
    onPress();

    expect(mockedAlert.alert).toHaveBeenCalledWith(
      'Quit Game?',
      'Are you sure you want to quit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: expect.any(Function) }
      ]
    );
  });

  it('navigates back when quit is confirmed on native', () => {
    Platform.OS = 'android';
    renderHook(() => useGameNavigation(mockNavigation as any));

    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();
    const onPress = quitButtonElement.props.onPress;
    
    onPress();

    // Get the quit confirmation callback
    const quitCallback = mockedAlert.alert.mock.calls[0][2][1].onPress;
    quitCallback();

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('handles web platform with window.confirm', () => {
    Platform.OS = 'web';
    (global.window.confirm as jest.Mock).mockReturnValue(true);

    renderHook(() => useGameNavigation(mockNavigation as any));

    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();
    const onPress = quitButtonElement.props.onPress;
    
    onPress();

    expect(global.window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to quit? Your progress will be lost.'
    );
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(mockedAlert.alert).not.toHaveBeenCalled();
  });

  it('does not navigate back when web confirm is cancelled', () => {
    Platform.OS = 'web';
    (global.window.confirm as jest.Mock).mockReturnValue(false);

    renderHook(() => useGameNavigation(mockNavigation as any));

    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();
    const onPress = quitButtonElement.props.onPress;
    
    onPress();

    expect(global.window.confirm).toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('creates quit button with correct styling', () => {
    Platform.OS = 'web';
    
    renderHook(() => useGameNavigation(mockNavigation as any));

    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();

    expect(quitButtonElement.props.style).toEqual({
      paddingLeft: 8,
      paddingRight: 16,
      paddingVertical: 8,
      marginRight: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 8,
      cursor: 'pointer',
    });

    // Check text styling
    const textElement = quitButtonElement.props.children;
    expect(textElement.props.style).toEqual({
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    });
    expect(textElement.props.children).toBe('Quit');
  });

  it('sets cursor pointer only on web platform', () => {
    Platform.OS = 'ios';
    
    renderHook(() => useGameNavigation(mockNavigation as any));

    const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
    const quitButtonElement = headerRightFn();

    expect(quitButtonElement.props.style.cursor).toBeUndefined();
  });

  it('handles navigation object changes', () => {
    const { rerender } = renderHook(
      (props) => useGameNavigation(props.navigation),
      { initialProps: { navigation: mockNavigation } }
    );

    const newMockNavigation = {
      setOptions: jest.fn(),
      goBack: jest.fn(),
    };

    rerender({ navigation: newMockNavigation as any });

    expect(newMockNavigation.setOptions).toHaveBeenCalledWith({
      headerRight: expect.any(Function),
    });
  });

  it('handles multiple renders correctly', () => {
    const { rerender } = renderHook(() => useGameNavigation(mockNavigation as any));

    rerender();
    rerender();

    // Should set options for each render
    expect(mockNavigation.setOptions).toHaveBeenCalledTimes(3);
  });

  it('cleans up properly on unmount', () => {
    const { unmount } = renderHook(() => useGameNavigation(mockNavigation as any));

    expect(() => unmount()).not.toThrow();
  });
});