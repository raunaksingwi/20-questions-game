import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export const LoadingGame: React.FC = () => {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Starting new game...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
});