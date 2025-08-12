import React, { useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import VoiceInputButton from './VoiceInputButton';
import { ProfessionalVoiceButton } from './voice/ProfessionalVoiceButton';
import { GameStatus } from '../../../shared/types';
import { INPUT_DIMENSIONS, CALCULATED_DIMENSIONS } from '../constants/inputDimensions';

interface GameInputProps {
  question: string;
  setQuestion: (question: string) => void;
  sending: boolean;
  gameStatus: GameStatus;
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
}

export const GameInput: React.FC<GameInputProps> = ({
  question,
  setQuestion,
  sending,
  gameStatus,
  onTextSubmit,
  onVoiceSubmit,
}) => {
  const insets = useSafeAreaInsets();
  
  // Shared values for input dimensions
  const inputWidth = useSharedValue(0);
  const inputHeight = useSharedValue(0);
  const inputX = useSharedValue(0);
  const inputY = useSharedValue(0);

  // Handle text input layout to get actual dimensions
  const handleTextInputLayout = useCallback((event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    inputWidth.value = width;
    inputHeight.value = height;
    inputX.value = x;
    inputY.value = y;
  }, [inputWidth, inputHeight, inputX, inputY]);

  return (
    <View style={[styles.inputSection, { paddingBottom: insets.bottom }]}>
      <View style={styles.inputContainer}>
        <View style={styles.textInputWrapper}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a yes/no question or make a guess..."
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