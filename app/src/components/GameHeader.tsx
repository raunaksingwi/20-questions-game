import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface GameHeaderProps {
  category: string;
  questionsRemaining: number;
  hintsRemaining: number;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  category,
  questionsRemaining,
  hintsRemaining,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.categoryText}>Category: {category}</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Questions: {questionsRemaining}/20</Text>
        <Text style={styles.statText}>Hints: {hintsRemaining}/3</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
});