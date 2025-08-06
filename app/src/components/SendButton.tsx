import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

type SendButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  inputText?: string;
  style?: object;
};

export default function SendButton({ 
  onPress, 
  disabled = false, 
  inputText = '',
  style = {} 
}: SendButtonProps) {
  const showSendButton = inputText.trim().length > 0;
  
  if (showSendButton) {
    return (
      <TouchableOpacity
        style={[styles.sendButton, disabled && styles.disabledButton, style]}
        onPress={onPress}
        disabled={disabled}
        testID="send-button"
        accessibilityLabel="Send message"
        accessibilityRole="button"
      >
        <Text style={[styles.sendText, disabled && styles.disabledText]}>
          Send
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.micButton, disabled && styles.disabledButton, style]}
      onPress={onPress}
      disabled={disabled}
      testID="mic-button"
      accessibilityLabel="Start voice recording"
      accessibilityRole="button"
    >
      <Feather 
        name="mic" 
        size={20} 
        color={disabled ? '#9CA3AF' : '#6366f1'} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sendButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});