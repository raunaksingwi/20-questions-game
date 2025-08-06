import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

type ModernWaveformVisualizerProps = {
  isRecording: boolean;
  volumeLevel?: number; // Between 0 and 1
  barCount?: number;
  color?: string;
  height?: number;
};

export const ModernWaveformVisualizer: React.FC<ModernWaveformVisualizerProps> = ({
  isRecording,
  volumeLevel = 0.5,
  barCount = 5,
  color = '#ffffff',
  height = 24,
}) => {
  // Create animated values for each bar
  const barHeights = Array.from({ length: barCount }, () => useSharedValue(0.2));
  const barOpacities = Array.from({ length: barCount }, () => useSharedValue(0.4));
  
  // Professional animation timings (inspired by iOS and Discord)
  const animationDuration = 400;
  const staggerDelay = 80;

  useEffect(() => {
    if (isRecording) {
      startWaveformAnimation();
    } else {
      stopWaveformAnimation();
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      updateWaveformWithVolume(volumeLevel);
    }
  }, [volumeLevel, isRecording]);

  const startWaveformAnimation = () => {
    barHeights.forEach((height, index) => {
      // Create organic wave patterns with different frequencies per bar
      const baseFrequency = 0.8 + (index * 0.3);
      const amplitude = 0.6 + (Math.sin(index) * 0.2);
      
      height.value = withRepeat(
        withSequence(
          withDelay(
            index * staggerDelay,
            withTiming(0.3 + (amplitude * 0.4), {
              duration: animationDuration + (index * 50),
            })
          ),
          withTiming(0.7 + (amplitude * 0.3), {
            duration: animationDuration - (index * 30),
          }),
          withTiming(0.4 + (amplitude * 0.2), {
            duration: animationDuration + (index * 40),
          })
        ),
        -1,
        false
      );

      // Subtle opacity animation for depth
      barOpacities[index].value = withRepeat(
        withSequence(
          withDelay(index * (staggerDelay / 2), withTiming(0.8, { duration: 600 })),
          withTiming(0.5, { duration: 600 })
        ),
        -1,
        false
      );
    });
  };

  const stopWaveformAnimation = () => {
    barHeights.forEach((height, index) => {
      // Smooth fade to resting state
      height.value = withDelay(
        index * 50,
        withTiming(0.2, { duration: 300 })
      );
      barOpacities[index].value = withDelay(
        index * 50,
        withTiming(0.4, { duration: 300 })
      );
    });
  };

  const updateWaveformWithVolume = (volume: number) => {
    // Enhanced volume-responsive animation
    const enhancedVolume = Math.pow(volume, 0.7); // More responsive curve
    
    barHeights.forEach((height, index) => {
      // Create center-heavy distribution (middle bars respond more)
      const centerDistance = Math.abs(index - (barCount - 1) / 2);
      const centerWeight = 1 - (centerDistance / ((barCount - 1) / 2)) * 0.4;
      
      // Add some randomness for organic feel
      const randomFactor = 0.9 + (Math.random() * 0.2);
      
      // Calculate target height with volume influence
      const baseHeight = 0.3;
      const volumeHeight = enhancedVolume * centerWeight * randomFactor;
      const targetHeight = Math.min(0.95, baseHeight + volumeHeight * 0.6);
      
      height.value = withTiming(targetHeight, { duration: 120 });
      
      // Volume affects opacity for richer feedback
      const targetOpacity = Math.max(0.4, 0.5 + (enhancedVolume * centerWeight * 0.4));
      barOpacities[index].value = withTiming(targetOpacity, { duration: 150 });
    });
  };

  const renderBars = () => {
    return barHeights.map((heightValue, index) => {
      const animatedStyle = useAnimatedStyle(() => {
        const barHeight = interpolate(
          heightValue.value,
          [0.2, 1],
          [height * 0.25, height],
          Extrapolate.CLAMP
        );
        
        return {
          height: barHeight,
          opacity: barOpacities[index].value,
          transform: [
            {
              scaleY: interpolate(
                heightValue.value,
                [0.2, 1],
                [0.4, 1],
                Extrapolate.CLAMP
              ),
            },
          ],
        };
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              width: 2, // Slightly thinner for integrated button
              borderRadius: 1,
              marginHorizontal: 1, // Less spacing for compact design
            },
            animatedStyle,
          ]}
        />
      );
    });
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.barsContainer}>
        {renderBars()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4, // Reduced padding for integrated button
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  bar: {
    alignSelf: 'center',
  },
});