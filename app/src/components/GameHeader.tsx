/**
 * Game header component that displays current game status and action buttons.
 * Shows category, question counter, and context-appropriate buttons (Win/Hint/Quit).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { GameMode } from '../types/types';

interface GameHeaderProps {
  category: string;
  questionsRemaining: number;
  hintsRemaining: number;
  mode?: GameMode;
  questionsAsked?: number;
  onWinPress?: () => void;
  onHintPress?: () => void;
  onQuitPress?: () => void;
  disabled?: boolean;
}

/**
 * Renders the game header with status information and action buttons.
 * Adapts UI based on game mode (user-guessing vs AI-guessing).
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  category,
  questionsRemaining,
  hintsRemaining,
  mode = GameMode.USER_GUESSING,
  questionsAsked = 0,
  onWinPress,
  onHintPress,
  onQuitPress,
  disabled = false,
}) => {
  const isThinkMode = mode === GameMode.AI_GUESSING;
  const quitConfirmationTitle = 'Quit Game?';
  const quitConfirmationMessage = 'Are you sure you want to quit? Your progress will be lost.';
  const quitButtonLabel = 'Quit';
  const shouldDisableHint = disabled || hintsRemaining === 0;
  
  /**
   * Handles quit button press with confirmation dialog.
   * Shows platform-appropriate confirmation (Alert vs window.confirm).
   */
  const handleQuitPress = () => {
    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(quitConfirmationMessage);
      if (isConfirmed) {
        onQuitPress?.();
      }
    } else {
      Alert.alert(
        quitConfirmationTitle,
        quitConfirmationMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: quitButtonLabel, 
            style: 'destructive', 
            onPress: () => onQuitPress?.()
          }
        ]
      );
    }
  };
  
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleContainer}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.categoryText}>{category}</Text>
            {isThinkMode && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Think</Text>
              </View>
            )}
          </View>
          <Text style={styles.counterText}>
            {isThinkMode ? `Q ${questionsAsked}/20` : `Q ${20 - questionsRemaining}/20`}
          </Text>
        </View>
        
        {/* Action Buttons - WIN & QUIT for Think mode, Hint for Guess mode */}
        <View style={styles.actionButtonsContainer}>
          {isThinkMode ? (
            <>
              {/* Only show WIN button if onWinPress is provided */}
              {onWinPress && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.winButton, disabled && styles.disabledButton]}
                  onPress={onWinPress}
                  disabled={disabled}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionButtonText, styles.winButtonText, disabled && styles.disabledButtonText]}>
                    WIN
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.quitButton]}
                onPress={handleQuitPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, styles.quitButtonText]}>
                  {quitButtonLabel}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.hintButton, 
                  shouldDisableHint && styles.disabledButton
                ]}
                onPress={onHintPress}
                disabled={shouldDisableHint}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.actionButtonText, 
                  styles.hintButtonText, 
                  shouldDisableHint && styles.disabledButtonText
                ]}>
                  Hint ({hintsRemaining})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.quitButton]}
                onPress={handleQuitPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, styles.quitButtonText]}>
                  {quitButtonLabel}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 15,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  counterText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  winButton: {
    backgroundColor: '#22c55e',
  },
  hintButton: {
    backgroundColor: '#6366f1',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  winButtonText: {
    color: '#fff',
  },
  hintButtonText: {
    color: '#fff',
  },
  quitButton: {
    backgroundColor: '#ef4444',
  },
  disabledButtonText: {
    color: '#fff',
    opacity: 0.7,
  },
  quitButtonText: {
    color: '#fff',
  },
});
