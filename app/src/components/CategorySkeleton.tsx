import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function CategorySkeleton() {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, index) => (
        <Animated.View
          key={index}
          style={[styles.skeleton, { opacity }]}
        >
          <View style={styles.titleSkeleton} />
          <View style={styles.descriptionSkeleton} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  skeleton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  descriptionSkeleton: {
    height: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    width: '80%',
  },
});