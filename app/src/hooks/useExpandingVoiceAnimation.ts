import { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, interpolate, SharedValue } from 'react-native-reanimated';
import { INPUT_DIMENSIONS } from '../constants/inputDimensions';

export interface ExpandingVoiceAnimation {
  animatedExpandingStyle: any;
  animatedWaveContainerStyle: any;
  animatedWaveStyle: any;
  startExpanding: () => void;
  stopExpanding: () => void;
  pressIn: () => void;
  pressOut: () => void;
}

type InputDimensions = {
  width: SharedValue<number>;
  height: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
};

export const useExpandingVoiceAnimation = (inputDimensions: InputDimensions): ExpandingVoiceAnimation => {
  // Expanding animation values
  const expandProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Wave animation values
  const waveOpacity = useSharedValue(0);
  const wave1Scale = useSharedValue(1);
  const wave2Scale = useSharedValue(1);
  const wave3Scale = useSharedValue(1);

  // Animation configs
  const springConfig = {
    damping: 20,
    stiffness: 150,
    mass: 1,
  };

  const expandingAnimConfig = {
    duration: 300,
  };

  const waveConfig = {
    duration: 1200,
  };

  const animatedExpandingStyle = useAnimatedStyle(() => {
    const buttonSize = INPUT_DIMENSIONS.VOICE_BUTTON_SIZE;
    const actualInputWidth = inputDimensions.width.value;
    const actualInputHeight = inputDimensions.height.value;
    
    // Use actual dimensions if available, fallback to constants
    const targetWidth = actualInputWidth > 0 ? actualInputWidth : 280;
    const targetHeight = actualInputHeight > 0 ? actualInputHeight : INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT;
    
    if (expandProgress.value === 0) {
      // Normal button state
      return {
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        transform: [{ scale: scale.value }],
        position: 'relative' as const,
        zIndex: 10,
      };
    } else {
      // Expanded state - position absolutely to cover the entire input
      const opacity = interpolate(
        expandProgress.value,
        [0, 0.3, 1],
        [0, 0.8, 1]
      );
      
      return {
        width: targetWidth,
        height: targetHeight,
        borderRadius: INPUT_DIMENSIONS.TEXT_INPUT_BORDER_RADIUS,
        position: 'absolute' as const,
        top: -(targetHeight - buttonSize) / 2, // Center vertically relative to button
        right: targetWidth - buttonSize, // Align right edge with button
        transform: [{ scale: scale.value }],
        zIndex: 20,
        opacity,
      };
    }
  });

  const animatedWaveContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: waveOpacity.value,
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };
  });

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: wave1Scale.value }
      ],
    };
  });

  const pressIn = () => {
    'worklet';
    scale.value = withSpring(0.95, springConfig);
  };

  const pressOut = () => {
    'worklet';
    scale.value = withSpring(1, springConfig);
  };

  const startExpanding = () => {
    'worklet';
    // Expand the button to cover the input
    expandProgress.value = withTiming(1, expandingAnimConfig);
    
    // Start wave animations with slight delays
    waveOpacity.value = withTiming(1, { duration: 200 });
    
    wave1Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, waveConfig),
        withTiming(0.8, waveConfig)
      ),
      -1,
      false
    );
    
    wave2Scale.value = withRepeat(
      withSequence(
        withTiming(0.8, waveConfig),
        withTiming(1.2, waveConfig)
      ),
      -1,
      false
    );
    
    wave3Scale.value = withRepeat(
      withSequence(
        withTiming(1.1, waveConfig),
        withTiming(0.9, waveConfig)
      ),
      -1,
      false
    );
  };

  const stopExpanding = () => {
    'worklet';
    // Immediately reset scale
    scale.value = withSpring(1, springConfig);
    
    // Collapse back to original size with faster animation
    expandProgress.value = withTiming(0, { duration: 200 });
    
    // Stop wave animations immediately
    waveOpacity.value = withTiming(0, { duration: 100 });
    wave1Scale.value = withTiming(1, { duration: 100 });
    wave2Scale.value = withTiming(1, { duration: 100 });
    wave3Scale.value = withTiming(1, { duration: 100 });
  };

  return {
    animatedExpandingStyle,
    animatedWaveContainerStyle,
    animatedWaveStyle,
    startExpanding,
    stopExpanding,
    pressIn,
    pressOut,
  };
};