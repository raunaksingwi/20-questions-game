import { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withDelay, interpolate, Extrapolate, withSequence } from 'react-native-reanimated';

export interface AdvancedButtonAnimations {
  animatedButtonStyle: any;
  animatedRippleStyle: any;
  animatedPulseStyle: any;
  animatedGlowStyle: any;
  startRecording: () => void;
  stopRecording: () => void;
  pressIn: () => void;
  pressOut: () => void;
}

export const useAdvancedButtonAnimations = (): AdvancedButtonAnimations => {
  // Core button values
  const scale = useSharedValue(1);
  const buttonSize = useSharedValue(40); // Integrated knob size to match text input
  const borderRadius = useSharedValue(20);
  const elevation = useSharedValue(1); // Reduced for integrated look
  
  // Recording state values
  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(0);
  
  // Ripple effect values
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  
  // Pulse effect values
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  
  // Glow effect values
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  // Professional spring config for smooth animations
  const springConfig = {
    damping: 15,
    stiffness: 200,
    mass: 1,
  };

  // Smooth timing config
  const timingConfig = {
    duration: 250,
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      width: buttonSize.value,
      height: buttonSize.value,
      borderRadius: borderRadius.value,
      transform: [
        { scale: scale.value * recordingScale.value },
      ],
      elevation: elevation.value,
      shadowOffset: { width: 0, height: elevation.value },
      shadowOpacity: interpolate(elevation.value, [2, 8], [0.15, 0.3]),
      shadowRadius: elevation.value,
    };
  });

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: glowOpacity.value,
    };
  });

  const pressIn = () => {
    'worklet';
    // Subtle press feedback like iOS - adjusted for smaller button
    scale.value = withSpring(0.92, springConfig);
    elevation.value = withTiming(0.5, { duration: 100 });
    
    // Immediate ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.3;
    rippleScale.value = withTiming(1.2, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
  };

  const pressOut = () => {
    'worklet';
    // Smooth return to normal state
    scale.value = withSpring(1, springConfig);
    elevation.value = withTiming(1, { duration: 200 });
  };

  const startRecording = () => {
    'worklet';
    // Professional recording animation sequence - adjusted for integrated button
    
    // 1. Subtle scale up for integrated look (less dramatic than standalone)
    recordingScale.value = withSpring(1.08, { ...springConfig, stiffness: 300 });
    elevation.value = withTiming(3, timingConfig);
    
    // 2. Subtle pulse animation for integrated look
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(0.1, { duration: 800 })
      ),
      -1,
      false
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1.05, { duration: 800 })
      ),
      -1,
      false
    );
    
    // 3. Subtle glow effect for integrated button
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200 }),
        withTiming(0.15, { duration: 1200 })
      ),
      -1,
      false
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1200 }),
        withTiming(1.1, { duration: 1200 })
      ),
      -1,
      false
    );
  };

  const stopRecording = () => {
    'worklet';
    // Smooth stop animation for integrated button
    
    // 1. Subtle bounce to acknowledge completion
    recordingScale.value = withSequence(
      withTiming(1.12, { duration: 100 }),
      withSpring(1, springConfig)
    );
    
    // 2. Reset elevation smoothly
    elevation.value = withTiming(1, { duration: 300 });
    
    // 3. Fade out all effects smoothly
    pulseOpacity.value = withTiming(0, { duration: 300 });
    pulseScale.value = withTiming(1, { duration: 300 });
    glowOpacity.value = withTiming(0, { duration: 300 });
    glowScale.value = withTiming(1, { duration: 300 });
  };

  return {
    animatedButtonStyle,
    animatedRippleStyle,
    animatedPulseStyle,
    animatedGlowStyle,
    startRecording,
    stopRecording,
    pressIn,
    pressOut,
  };
};