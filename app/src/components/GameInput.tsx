import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VoiceInputButton from './VoiceInputButton';
import { GameStatus } from '../../../../shared/types';

interface GameInputProps {
  question: string;
  setQuestion: (question: string) => void;
  sending: boolean;
  gameStatus: GameStatus;
  hintsRemaining: number;
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
  onRequestHint: () => void;
}

export const GameInput: React.FC<GameInputProps> = ({
  question,
  setQuestion,
  sending,
  gameStatus,
  hintsRemaining,
  onTextSubmit,
  onVoiceSubmit,
  onRequestHint,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.inputSection, { paddingBottom: insets.bottom }]}>
      <View style={styles.inputContainer}>
        <View style={styles.textInputWrapper}>
          <TextInput
            style={styles.textInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask a yes/no question or make a guess..."
            onSubmitEditing={onTextSubmit}
            editable={!sending && gameStatus === 'active'}
            autoCapitalize="sentences"
          />
        </View>
        <View style={styles.voiceButtonContainer}>
          <VoiceInputButton
            onTextSubmit={onTextSubmit}
            onVoiceSubmit={onVoiceSubmit}
            inputText={question}
            setInputText={setQuestion}
            disabled={sending || gameStatus !== 'active'}
          />
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.hintButton, (hintsRemaining === 0 || sending) && styles.disabledButton]}
          onPress={onRequestHint}
          disabled={hintsRemaining === 0 || sending || gameStatus !== 'active'}
        >
          <Text style={styles.hintButtonText}>
            💡 Get Hint ({hintsRemaining} left)
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingRight: 50,
    paddingVertical: 12,
    fontSize: 16,
    height: 44,
  },
  voiceButtonContainer: {
    position: 'absolute',
    right: 17,
    top: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  actionButtons: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  hintButton: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  hintButtonText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});