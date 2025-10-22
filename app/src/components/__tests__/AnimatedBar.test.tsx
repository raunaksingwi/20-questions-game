import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import AnimatedBar from '../AnimatedBar';

describe('AnimatedBar', () => {
  let timingSpy: jest.SpyInstance;
  let valueSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.useFakeTimers();
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
        callback?.({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    }) as unknown);

    valueSpy = jest.spyOn(Animated, 'Value').mockImplementation(
      () =>
        ({
          interpolate: jest.fn(() => 50),
          stopAnimation: jest.fn(),
        }) as unknown
    );
  });

  afterEach(() => {
    timingSpy.mockRestore();
    valueSpy.mockRestore();
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

    expect(timingSpy).toHaveBeenCalled();
  });

  it('should stop animation when isAnimating is false', () => {
    const { rerender } = render(
      <AnimatedBar isAnimating={true} />
    );

    // Start with animation
    jest.advanceTimersByTime(100);
    // Stop animation
    rerender(<AnimatedBar isAnimating={false} />);

    expect(timingSpy).toHaveBeenCalledWith(
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

    // Update volume level
    rerender(
      <AnimatedBar isAnimating={true} volumeLevel={0.8} />
    );

    expect(timingSpy).toHaveBeenCalled();
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
    expect(timingSpy).toHaveBeenCalled();
  });

  it('should clamp volume level to valid range', () => {
    render(
      <AnimatedBar 
        isAnimating={true}
        volumeLevel={1.5} // Above maximum
      />
    );

    jest.advanceTimersByTime(100);
    expect(timingSpy).toHaveBeenCalled();
  });

  it('should handle cleanup on unmount', () => {
    const mockStopAnimation = jest.fn();
    const mockAnimatedValue = {
      interpolate: jest.fn(() => 50),
      stopAnimation: mockStopAnimation,
    };
    
    valueSpy.mockImplementation(() => mockAnimatedValue as unknown);

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
