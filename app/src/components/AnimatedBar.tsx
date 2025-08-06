import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

type AnimatedBarProps = {
  isAnimating: boolean;
  volumeLevel?: number;
  color?: string;
  height?: number;
  index?: number;
  style?: object;
};

export default function AnimatedBar({ 
  isAnimating, 
  volumeLevel = 0.5, 
  color = '#ffffff', 
  height = 30,
  index = 0,
  style = {}
}: AnimatedBarProps) {
  const animation = useRef(new Animated.Value(0.2));

  useEffect(() => {
    if (isAnimating) {
      startBarAnimation();
    } else {
      stopBarAnimation();
    }

    return () => {
      animation.current.stopAnimation();
    };
  }, [isAnimating]);

  useEffect(() => {
    if (isAnimating) {
      updateBarHeight(volumeLevel);
    }
  }, [volumeLevel, isAnimating]);

  const startBarAnimation = () => {
    const animateBar = () => {
      const randomHeight = Math.random() * 0.8 + 0.2;
      const duration = 150 + Math.random() * 200;
      
      Animated.timing(animation.current, {
        toValue: randomHeight,
        duration,
        useNativeDriver: false,
      }).start(() => {
        if (isAnimating) {
          setTimeout(animateBar, index * 20);
        }
      });
    };
    
    setTimeout(animateBar, index * 50);
  };

  const updateBarHeight = (volume: number) => {
    const baseHeight = Math.max(0.2, volume);
    const variation = (Math.sin(Date.now() / 100 + index) + 1) / 2;
    const targetHeight = Math.min(1.0, baseHeight + variation * 0.3);
    
    Animated.timing(animation.current, {
      toValue: targetHeight,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const stopBarAnimation = () => {
    animation.current.stopAnimation();
    Animated.timing(animation.current, {
      toValue: 0.2,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const barHeight = animation.current.interpolate({
    inputRange: [0.2, 1],
    outputRange: [height * 0.3, height],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      testID={`animated-bar-${index}`}
      style={[
        {
          height: barHeight,
          backgroundColor: color,
          marginHorizontal: 2,
          width: 3,
          borderRadius: 1.5,
          minHeight: 4,
        },
        Platform.OS === 'web' && {
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
        style,
      ]}
    />
  );
}