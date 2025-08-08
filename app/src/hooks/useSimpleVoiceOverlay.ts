import { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

export interface SimpleVoiceOverlay {
  // Button animations (simple scale only)
  buttonAnimatedStyle: any;
  buttonPressIn: () => void;
  buttonPressOut: () => void;
  
  // Overlay animations (show/hide over input)
  overlayAnimatedStyle: any;
  showOverlay: () => void;
  hideOverlay: () => void;
}

export const useSimpleVoiceOverlay = (): SimpleVoiceOverlay => {
  // Simple button scale animation
  const buttonScale = useSharedValue(1);
  
  // Overlay visibility
  const overlayOpacity = useSharedValue(0);

  // Button animations - just simple scale feedback
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Overlay animations - just opacity, no scale to avoid jitter
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Button press feedback
  const buttonPressIn = () => {
    'worklet';
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const buttonPressOut = () => {
    'worklet';
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Overlay show/hide
  const showOverlay = () => {
    'worklet';
    overlayOpacity.value = withTiming(1, { duration: 200 });
  };

  const hideOverlay = () => {
    'worklet';
    overlayOpacity.value = withTiming(0, { duration: 150 });
  };

  return {
    buttonAnimatedStyle,
    buttonPressIn,
    buttonPressOut,
    overlayAnimatedStyle,
    showOverlay,
    hideOverlay,
  };
};