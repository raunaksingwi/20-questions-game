import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { GameMode } from '../../../shared/types';

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

export const GameHeader: React.FC<GameHeaderProps> = ({
  category,
  questionsRemaining,
  hintsRemaining,
  mode = 'guess',
  questionsAsked = 0,
  onWinPress,
  onHintPress,
  onQuitPress,
  disabled = false,
}) => {
  const isThinkMode = mode === 'think';
  
  const handleQuitPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
        onQuitPress?.();
      }
    } else {
      Alert.alert(
        'Quit Game?',
        'Are you sure you want to quit? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Quit', 
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
            {isThinkMode ? `Q ${questionsAsked}/20` : `Questions: ${questionsRemaining}/20`}
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
                  Quit
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.hintButton, 
                  (disabled || hintsRemaining === 0) && styles.disabledButton
                ]}
                onPress={onHintPress}
                disabled={disabled || hintsRemaining === 0}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.actionButtonText, 
                  styles.hintButtonText, 
                  (disabled || hintsRemaining === 0) && styles.disabledButtonText
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
                  Quit
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