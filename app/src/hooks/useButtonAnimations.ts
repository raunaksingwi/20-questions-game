import { Dimensions } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export interface ButtonAnimations {
  animatedButtonStyle: any;
  expandButton: () => void;
  contractButton: () => void;
}

export const useButtonAnimations = (): ButtonAnimations => {
  const buttonWidth = useSharedValue(40);
  const buttonHeight = useSharedValue(40);
  const borderRadius = useSharedValue(20);
  
  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: buttonWidth.value,
    height: buttonHeight.value,
    borderRadius: borderRadius.value,
  }));

  const expandButton = () => {
    const screenWidth = Dimensions.get('window').width;
    const fullInputWidth = screenWidth - 30;
    buttonWidth.value = withTiming(fullInputWidth, { duration: 200 });
    buttonHeight.value = withTiming(44, { duration: 200 });
    borderRadius.value = withTiming(22, { duration: 200 });
  };

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