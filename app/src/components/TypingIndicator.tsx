/**
 * Animated typing indicator component that shows three bouncing dots.
 * Used to indicate when the AI is thinking or processing a response.
 */
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Renders an animated three-dot typing indicator with scaling animation.
 * Each dot animates with a staggered delay to create a wave effect.
 */
export default function TypingIndicator() {
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );

    const animation1 = createAnimation(dot1, 0);
    const animation2 = createAnimation(dot2, 200);
    const animation3 = createAnimation(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  const scale1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const scale2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const scale3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <View style={styles.container} testID="typing-indicator">
      <View style={styles.messageContainer}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { transform: [{ scale: scale1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ scale: scale2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ scale: scale3 }] }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  messageContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
    borderBottomLeftRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
    marginHorizontal: 2,
  },
});