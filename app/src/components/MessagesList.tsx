import React, { useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GameMessage } from '../../../../shared/types';

interface MessagesListProps {
  messages: GameMessage[];
  sending: boolean;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  sending,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContent}
    >
      {messages.map((message, index) => (
        <View
          key={index}
          style={[
            styles.messageBubble,
            message.role === 'user' ? styles.userMessage : styles.assistantMessage,
            message.message_type === 'hint' && styles.hintMessage,
          ]}
        >
          <Text style={[
            styles.messageText,
            message.role === 'user' && styles.userMessageText,
          ]}>
            {message.content}
          </Text>
        </View>
      ))}
      {sending && (
        <View style={styles.loadingBubble}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hintMessage: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    padding: 20,
  },
});