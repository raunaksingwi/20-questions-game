/**
 * Quick answer chips component for AI-guessing mode.
 * Provides Yes/No/Maybe buttons and a WIN button for efficient user responses.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * Type definition for different quick answer options available to users.
 */
export type QuickAnswerType = 'yes' | 'no' | 'maybe' | 'dont_know' | 'you_won';

/**
 * Configuration for all available quick answer chips with their display labels.
 */
const QUICK_ANSWER_CHIPS = [
  { type: 'yes' as const, label: 'Yes', canonical: 'Yes' },
  { type: 'no' as const, label: 'No', canonical: 'No' },
  { type: 'maybe' as const, label: 'Maybe', canonical: 'Maybe' },
  { type: 'dont_know' as const, label: "Don't know", canonical: "Don't know" },
  { type: 'you_won' as const, label: 'You won!', canonical: 'You won!' },
] as const;


/**
 * Props for the QuickAnswerChips component.
 */
interface QuickAnswerChipsProps {
  /** Callback when a quick answer chip is pressed */
  onChipPress: (answer: string, type: QuickAnswerType) => void;
  /** Optional callback for the WIN button press */
  onWinPress?: () => void;
  /** Whether all chips should be disabled */
  disabled?: boolean;
}

/**
 * Renders a horizontal scrollable row of quick answer buttons.
 * Used in AI-guessing mode to provide fast response options.
 */
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
        {QUICK_ANSWER_CHIPS.map((chip) => {
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