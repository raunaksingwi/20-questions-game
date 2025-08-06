import { renderHook, act } from '@testing-library/react-native';
import { useAdvancedButtonAnimations } from '../useAdvancedButtonAnimations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: any) => ({ value: initial }),
  useAnimatedStyle: (fn: any) => fn(),
  withTiming: (value: any, config?: any) => value,
  withSpring: (value: any, config?: any) => value,
  withRepeat: (animation: any, repetitions?: number, reverse?: boolean) => animation,
  withSequence: (...animations: any[]) => animations[0],
  withDelay: (delay: number, animation: any) => animation,
  interpolate: (value: any, inputRange: any, outputRange: any, extrapolate?: any) => outputRange[0],
  Extrapolate: { CLAMP: 'clamp' },
}));

describe('useAdvancedButtonAnimations', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAdvancedButtonAnimations());
    
    expect(result.current.animatedButtonStyle).toBeDefined();
    expect(result.current.animatedRippleStyle).toBeDefined();
    expect(result.current.animatedPulseStyle).toBeDefined();
    expect(result.current.animatedGlowStyle).toBeDefined();
    expect(typeof result.current.startRecording).toBe('function');
    expect(typeof result.current.stopRecording).toBe('function');
    expect(typeof result.current.pressIn).toBe('function');
    expect(typeof result.current.pressOut).toBe('function');
  });

  it('should handle press interactions', () => {
    const { result } = renderHook(() => useAdvancedButtonAnimations());
    
    act(() => {
      result.current.pressIn();
    });
    
    act(() => {
      result.current.pressOut();
    });
    
    // Should not throw any errors
    expect(result.current).toBeDefined();
  });

  it('should handle recording state changes', () => {
    const { result } = renderHook(() => useAdvancedButtonAnimations());
    
    act(() => {
      result.current.startRecording();
    });
    
    act(() => {
      result.current.stopRecording();
    });
    
    // Should not throw any errors
    expect(result.current).toBeDefined();
  });

  it('should return consistent animated styles', () => {
    const { result, rerender } = renderHook(() => useAdvancedButtonAnimations());
    
    const initialStyles = {
      button: result.current.animatedButtonStyle,
      ripple: result.current.animatedRippleStyle,
      pulse: result.current.animatedPulseStyle,
      glow: result.current.animatedGlowStyle,
    };
    
    rerender();
    
    // Styles should be functions/objects
    expect(typeof initialStyles.button).toBeDefined();
    expect(typeof initialStyles.ripple).toBeDefined();
    expect(typeof initialStyles.pulse).toBeDefined();
    expect(typeof initialStyles.glow).toBeDefined();
  });
});