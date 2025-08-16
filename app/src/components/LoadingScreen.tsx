/**
 * Generic loading screen component with customizable message.
 * Displays a centered activity indicator with optional text.
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

/**
 * Props for the LoadingScreen component.
 */
interface LoadingScreenProps {
  /** Optional loading message to display below the spinner */
  message?: string;
}

/**
 * Renders a full-screen loading indicator with customizable message.
 * Used for general loading states throughout the app.
 */
export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});