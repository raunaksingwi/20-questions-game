import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

type WaveformVisualizerProps = {
  isRecording: boolean;
  volumeLevel?: number; // Between 0 and 1
  barCount?: number;
  color?: string;
  height?: number;
};

export default function WaveformVisualizer({
  isRecording,
  volumeLevel = 0.5,
  barCount = 5,
  color = '#ffffff',
  height = 30,
}: WaveformVisualizerProps) {
  const barAnimations = useRef<Animated.Value[]>([]);
  const pulseAnimation = useRef(new Animated.Value(0));

  // Initialize animations for each bar
  useEffect(() => {
    barAnimations.current = Array.from({ length: barCount }, () => new Animated.Value(0.2));
  }, [barCount]);

  // Start/stop animations based on recording state
  useEffect(() => {
    if (isRecording) {
      startWaveformAnimation();
      startPulseAnimation();
    } else {
      stopAnimations();
    }

    return () => {
      stopAnimations();
    };
  }, [isRecording]);

  // Update waveform based on volume level
  useEffect(() => {
    if (isRecording && barAnimations.current.length > 0) {
      updateWaveformHeight(volumeLevel);
    }
  }, [volumeLevel, isRecording]);

  const startWaveformAnimation = () => {
    // Create continuous animation for each bar with different timing
    barAnimations.current.forEach((animation, index) => {
      const animateBar = () => {
        const randomHeight = Math.random() * 0.8 + 0.2; // Between 0.2 and 1.0
        const duration = 150 + Math.random() * 200; // Varying duration for natural look
        
        Animated.timing(animation, {
          toValue: randomHeight,
          duration,
          useNativeDriver: false,
        }).start(() => {
          if (isRecording) {
            // Create a small delay between bars for wave effect
            setTimeout(animateBar, index * 20);
          }
        });
      };
      
      // Start each bar with a slight delay
      setTimeout(animateBar, index * 50);
    });
  };

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
        if (isRecording) {
          pulse();
        }
      });
    };
    pulse();
  };

  const updateWaveformHeight = (volume: number) => {
    // Update bar heights based on volume level
    barAnimations.current.forEach((animation, index) => {
      // Create variation based on volume and bar position
      const baseHeight = Math.max(0.2, volume);
      const variation = (Math.sin(Date.now() / 100 + index) + 1) / 2; // Smooth wave pattern
      const targetHeight = Math.min(1.0, baseHeight + variation * 0.3);
      
      Animated.timing(animation, {
        toValue: targetHeight,
        duration: 100,
        useNativeDriver: false,
      }).start();
    });
  };

  const stopAnimations = () => {
    // Reset all bars to minimum height
    barAnimations.current.forEach((animation) => {
      animation.stopAnimation();
      Animated.timing(animation, {
        toValue: 0.2,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    
    pulseAnimation.current.stopAnimation();
    pulseAnimation.current.setValue(0);
  };

  const renderBars = () => {
    return barAnimations.current.map((animation, index) => {
      const barHeight = animation.interpolate({
        inputRange: [0.2, 1],
        outputRange: [height * 0.3, height],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: barHeight,
              backgroundColor: color,
              marginHorizontal: 2,
              width: 3,
            },
          ]}
        />
      );
    });
  };

  const pulseOpacity = pulseAnimation.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  if (!isRecording) {
    return null;
  }

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View
        style={[
          styles.pulseBackground,
          {
            opacity: pulseOpacity,
            backgroundColor: color,
          },
        ]}
      />
      <View style={styles.barsContainer}>
        {renderBars()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 1.5,
    minHeight: 4,
  },
});