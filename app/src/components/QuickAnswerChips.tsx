import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';

export type QuickAnswerType = 'yes' | 'no' | 'maybe' | 'dont_know' | 'irrelevant' | 'you_won';

interface QuickAnswerChip {
  type: QuickAnswerType;
  label: string;
  canonical: string;
}

const QUICK_ANSWERS: QuickAnswerChip[] = [
  { type: 'yes', label: 'Yes', canonical: 'Yes' },
  { type: 'no', label: 'No', canonical: 'No' },
  { type: 'maybe', label: 'Maybe', canonical: 'Maybe' },
  { type: 'dont_know', label: "Don't know", canonical: "Don't know" },
  { type: 'irrelevant', label: 'Irrelevant', canonical: 'Irrelevant' },
  { type: 'you_won', label: 'You won!', canonical: 'You won!' },
];

interface QuickAnswerChipsProps {
  onChipPress: (answer: string, type: QuickAnswerType) => void;
  onWinPress?: () => void;
  disabled?: boolean;
}

export const QuickAnswerChips: React.FC<QuickAnswerChipsProps> = ({
  onChipPress,
  onWinPress,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {QUICK_ANSWERS.map((chip) => {
          const isWinButton = chip.type === 'you_won';
          const handlePress = isWinButton 
            ? onWinPress 
            : () => onChipPress(chip.canonical, chip.type);
          
          return (
            <TouchableOpacity
              key={chip.type}
              style={[
                styles.chip,
                isWinButton && styles.winChip,
                disabled && styles.disabledChip,
              ]}
              onPress={handlePress}
              disabled={disabled || (isWinButton && !onWinPress)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isWinButton ? "You won button" : `Quick answer: ${chip.label}`}
              accessibilityHint={isWinButton ? "Tap when the LLM guessed correctly" : "Tap to send this answer immediately"}
            >
              <Text style={[
                styles.chipText,
                isWinButton && styles.winChipText,
                disabled && styles.disabledChipText,
              ]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContainer: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    minWidth: 44, // Accessibility - minimum touch target
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledChip: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    opacity: 0.6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  disabledChipText: {
    color: '#9ca3af',
  },
  winChip: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  winChipText: {
    color: '#fff',
    fontWeight: '600',
  },
});