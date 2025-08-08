import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';

interface ExpandingWaveVisualizerProps {
  isRecording: boolean;
  volumeLevel: number;
  color: string;
}

export const ExpandingWaveVisualizer: React.FC<ExpandingWaveVisualizerProps> = ({
  isRecording,
  volumeLevel,
  color,
}) => {
  // Create animated styles for individual wave bars
  const createWaveBarStyle = (delay: number, baseHeight: number) => {
    return useAnimatedStyle(() => {
      const animatedHeight = isRecording
        ? interpolate(volumeLevel, [0, 1], [baseHeight, baseHeight * 2])
        : baseHeight;
      
      return {
        height: animatedHeight,
        backgroundColor: color,
      };
    });
  };

  const wave1Style = createWaveBarStyle(0, 8);
  const wave2Style = createWaveBarStyle(100, 12);
  const wave3Style = createWaveBarStyle(200, 16);
  const wave4Style = createWaveBarStyle(150, 14);
  const wave5Style = createWaveBarStyle(50, 10);
  const wave6Style = createWaveBarStyle(250, 12);
  const wave7Style = createWaveBarStyle(300, 8);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.waveBar, wave1Style]} />
      <Animated.View style={[styles.waveBar, wave2Style]} />
      <Animated.View style={[styles.waveBar, wave3Style]} />
      <Animated.View style={[styles.waveBar, wave4Style]} />
      <Animated.View style={[styles.waveBar, wave5Style]} />
      <Animated.View style={[styles.waveBar, wave6Style]} />
      <Animated.View style={[styles.waveBar, wave7Style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    opacity: 0.8,
  },
});