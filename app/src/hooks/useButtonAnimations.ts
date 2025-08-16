/**
 * Hook for managing button expand/contract animations.
 * Provides smooth transitions for voice button size changes.
 */
import { Dimensions } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

/**
 * Interface for button animation hook return value.
 */
export interface ButtonAnimations {
  /** Animated style object for the button */
  animatedButtonStyle: any;
  /** Function to expand the button to full width */
  expandButton: () => void;
  /** Function to contract the button to original size */
  contractButton: () => void;
}

/**
 * Custom hook for button expansion/contraction animations.
 * Manages smooth transitions for voice input button resizing.
 */
export const useButtonAnimations = (): ButtonAnimations => {
  const buttonWidth = useSharedValue(40);
  const buttonHeight = useSharedValue(40);
  const borderRadius = useSharedValue(20);
  
  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: buttonWidth.value,
    height: buttonHeight.value,
    borderRadius: borderRadius.value,
  }));

  /**
   * Expands the button to full input width with smooth animation.
   */
  const expandButton = () => {
    const screenWidth = Dimensions.get('window').width;
    const fullInputWidth = screenWidth - 30;
    buttonWidth.value = withTiming(fullInputWidth, { duration: 200 });
    buttonHeight.value = withTiming(44, { duration: 200 });
    borderRadius.value = withTiming(22, { duration: 200 });
  };

  /**
   * Contracts the button back to its original circular size.
   */
  const contractButton = () => {
    buttonWidth.value = withTiming(40, { duration: 200 });
    buttonHeight.value = withTiming(40, { duration: 200 });
    borderRadius.value = withTiming(20, { duration: 200 });
  };

  return {
    animatedButtonStyle,
    expandButton,
    contractButton,
  };
};