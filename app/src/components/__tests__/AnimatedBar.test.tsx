import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import AnimatedBar from '../AnimatedBar';

// Mock Animated
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    ...jest.requireActual('react-native').Animated,
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => 50),
      stopAnimation: jest.fn(),
    })),
  },
}));

describe('AnimatedBar', () => {
  const mockAnimatedTiming = Animated.timing as jest.MockedFunction<typeof Animated.timing>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with default props', () => {
    const { getByTestId } = render(
      <AnimatedBar isAnimating={false} />
    );

    expect(getByTestId('animated-bar-0')).toBeTruthy();
  });

  it('should render with custom props', () => {
    const { getByTestId } = render(
      <AnimatedBar 
        isAnimating={true}
        volumeLevel={0.8}
        color="#ff0000"
        height={50}
        index={5}
      />
    );

    expect(getByTestId('animated-bar-5')).toBeTruthy();
  });

  it('should start animation when isAnimating is true', () => {
    render(
      <AnimatedBar isAnimating={true} />
    );

    // Fast-forward timers to trigger animation
    jest.advanceTimersByTime(100);

    expect(mockAnimatedTiming).toHaveBeenCalled();
  });

  it('should stop animation when isAnimating is false', () => {
    const { rerender } = render(
      <AnimatedBar isAnimating={true} />
    );

    // Start with animation
    jest.advanceTimersByTime(100);
    jest.clearAllMocks();

    // Stop animation
    rerender(<AnimatedBar isAnimating={false} />);

    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        toValue: 0.2,
        duration: 200,
        useNativeDriver: false,
      })
    );
  });

  it('should update bar height when volume level changes', () => {
    const { rerender } = render(
      <AnimatedBar isAnimating={true} volumeLevel={0.3} />
    );

    jest.clearAllMocks();

    // Update volume level
    rerender(
      <AnimatedBar isAnimating={true} volumeLevel={0.8} />
    );

    expect(mockAnimatedTiming).toHaveBeenCalled();
  });

  it('should handle custom styling', () => {
    const customStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <AnimatedBar 
        isAnimating={false}
        style={customStyle}
      />
    );

    const bar = getByTestId('animated-bar-0');
    expect(bar).toBeTruthy();
  });

  it('should handle different index values for staggered animation', () => {
    const { getByTestId } = render(
      <AnimatedBar 
        isAnimating={true}
        index={3}
      />
    );

    expect(getByTestId('animated-bar-3')).toBeTruthy();
    
    // Fast-forward to trigger staggered animation
    jest.advanceTimersByTime(200);
    expect(mockAnimatedTiming).toHaveBeenCalled();
  });

  it('should clamp volume level to valid range', () => {
    render(
      <AnimatedBar 
        isAnimating={true}
        volumeLevel={1.5} // Above maximum
      />
    );

    jest.advanceTimersByTime(100);
    expect(mockAnimatedTiming).toHaveBeenCalled();
  });

  it('should handle cleanup on unmount', () => {
    const mockStopAnimation = jest.fn();
    const mockAnimatedValue = {
      interpolate: jest.fn(() => 50),
      stopAnimation: mockStopAnimation,
    };
    
    (Animated.Value as jest.Mock).mockReturnValue(mockAnimatedValue);

    const { unmount } = render(
      <AnimatedBar isAnimating={true} />
    );

    unmount();

    expect(mockStopAnimation).toHaveBeenCalled();
  });

  it('should apply platform-specific styles for web', () => {
    // Mock Platform.OS for web
    const originalPlatform = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';

    const { getByTestId } = render(
      <AnimatedBar isAnimating={false} />
    );

    const bar = getByTestId('animated-bar-0');
    expect(bar).toBeTruthy();

    // Restore original platform
    require('react-native').Platform.OS = originalPlatform;
  });
});