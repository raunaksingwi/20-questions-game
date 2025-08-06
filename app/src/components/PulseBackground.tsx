import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

type PulseBackgroundProps = {
  isActive: boolean;
  color?: string;
  style?: object;
};

export default function PulseBackground({ 
  isActive, 
  color = '#ffffff',
  style = {}
}: PulseBackgroundProps) {
  const pulseAnimation = useRef(new Animated.Value(0));

  useEffect(() => {
    if (isActive) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }

    return () => {
      pulseAnimation.current.stopAnimation();
    };
  }, [isActive]);

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation.current, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnimation.current, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (isActive) {
          pulse();
        }
      });
    };
    pulse();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.current.stopAnimation();
    pulseAnimation.current.setValue(0);
  };

  const pulseOpacity = pulseAnimation.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View
      testID="pulse-background"
      style={[
        {
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: 15,
          opacity: pulseOpacity,
          backgroundColor: color,
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