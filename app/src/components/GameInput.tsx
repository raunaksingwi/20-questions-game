/**
 * Game input component that handles both text and voice input for the game.
 * Adapts interface based on game mode (user-guessing vs AI-guessing).
 */
import React, { useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import VoiceInputButton from './VoiceInputButton';
import { ProfessionalVoiceButton } from './voice/ProfessionalVoiceButton';
import { QuickAnswerChips, QuickAnswerType } from './QuickAnswerChips';
import { GameStatus, GameMode } from '../types/types';
import { INPUT_DIMENSIONS, CALCULATED_DIMENSIONS } from '../constants/inputDimensions';

interface GameInputProps {
  question: string;
  setQuestion: (question: string) => void;
  sending: boolean;
  gameStatus: GameStatus;
  mode?: GameMode;
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
  onQuickAnswer?: (answer: string, type: QuickAnswerType) => void;
  onWinPress?: () => void;
}

/**
 * Renders the appropriate input interface based on the current game mode.
 * Shows quick answer chips for AI-guessing mode or text/voice input for user-guessing mode.
 */
export const GameInput: React.FC<GameInputProps> = ({
  question,
  setQuestion,
  sending,
  gameStatus,
  mode = GameMode.USER_GUESSING,
  onTextSubmit,
  onVoiceSubmit,
  onQuickAnswer,
  onWinPress,
}) => {
  const insets = useSafeAreaInsets();
  
  // Shared values for input dimensions
  const inputWidth = useSharedValue(0);
  const inputHeight = useSharedValue(0);
  const inputX = useSharedValue(0);
  const inputY = useSharedValue(0);

  /**
   * Captures text input layout dimensions for voice button positioning.
   */
  const handleTextInputLayout = useCallback((event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    inputWidth.value = width;
    inputHeight.value = height;
    inputX.value = x;
    inputY.value = y;
  }, [inputWidth, inputHeight, inputX, inputY]);

  const isAIGuessingMode = mode === GameMode.AI_GUESSING;
  const placeholder = isAIGuessingMode 
    ? "Answer the question or type your response..."
    : "Ask a yes/no question or make a guess...";

  /**
   * Handles quick answer chip selections and forwards them to the parent component.
   */
  const handleQuickAnswer = useCallback((answer: string, type: QuickAnswerType) => {
    if (onQuickAnswer) {
      onQuickAnswer(answer, type);
    }
  }, [onQuickAnswer]);

  return (
    <View style={[styles.inputSection, { paddingBottom: insets.bottom }]}>
      {/* Quick Answer Chips - only show in AI Guessing mode and when awaiting user answer */}
      {isAIGuessingMode && (
        <QuickAnswerChips
          onChipPress={handleQuickAnswer}
          onWinPress={onWinPress}
          disabled={sending || gameStatus !== 'active'}
        />
      )}
      
      {/* Text input and voice button - hide in AI Guessing mode */}
      {!isAIGuessingMode && (
        <View style={styles.inputContainer}>
          <View style={styles.textInputWrapper}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={question}
                onChangeText={setQuestion}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                onSubmitEditing={onTextSubmit}
                editable={!sending && gameStatus === 'active'}
                autoCapitalize="sentences"
                selectionColor="transparent"
                textContentType="none"
                spellCheck={false}
                autoCorrect={false}
                onLayout={handleTextInputLayout}
              />
              <View style={styles.voiceButtonContainer}>
                <ProfessionalVoiceButton
                  onTextSubmit={onTextSubmit}
                  onVoiceSubmit={onVoiceSubmit}
                  inputText={question}
                  setInputText={setQuestion}
                  disabled={sending || gameStatus !== 'active'}
                  inputDimensions={{
                    width: inputWidth,
                    height: inputHeight,
                    x: inputX,
                    y: inputY,
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputContainer: {
    position: 'relative',
    padding: 15,
    paddingBottom: 10,
  },
  textInputWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  inputRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: INPUT_DIMENSIONS.TEXT_INPUT_BORDER_RADIUS,
    paddingHorizontal: INPUT_DIMENSIONS.TEXT_INPUT_HORIZONTAL_PADDING,
    paddingRight: CALCULATED_DIMENSIONS.TEXT_INPUT_RIGHT_PADDING,
    paddingVertical: INPUT_DIMENSIONS.TEXT_INPUT_VERTICAL_PADDING,
    fontSize: 16,
    height: INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT,
  },
  voiceButtonContainer: {
    position: 'absolute',
    right: CALCULATED_DIMENSIONS.VOICE_BUTTON_RIGHT_OFFSET,
    top: CALCULATED_DIMENSIONS.VOICE_BUTTON_TOP_OFFSET,
    width: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
    height: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
    // Allow overflow for expanding animation
    overflow: 'visible',
  },
});