import React, { useRef, useEffect, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GameMessage } from '../../../shared/types';

interface LoadingMessage {
  role: 'system';
  content: 'loading';
  message_type: 'loading';
}

type MessageItem = GameMessage | LoadingMessage;

interface MessagesListProps {
  messages: GameMessage[];
  sending: boolean;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  sending,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Create data array including loading indicator
  const data = React.useMemo(() => {
    const items: MessageItem[] = [...messages];
    if (sending) {
      items.push({ role: 'system', content: 'loading', message_type: 'loading' });
    }
    return items;
  }, [messages, sending]);

  // Content container style with padding
  const contentContainerStyle = React.useMemo(() => ({
    paddingTop: 15,
    paddingBottom: 20,
  }), []);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, []);

  // Scroll when data changes
  useEffect(() => {
    scrollToBottom();
  }, [data, scrollToBottom]);

  const renderItem = useCallback(({ item, index }: { item: MessageItem, index: number }) => {
    if (item.content === 'loading') {
      return (
        <View style={styles.loadingBubble}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userMessage : styles.assistantMessage,
          item.message_type === 'hint' && styles.hintMessage,
        ]}
      >
        <Text style={[
          styles.messageText,
          item.role === 'user' && styles.userMessageText,
        ]}>
          {item.content}
        </Text>
      </View>
    );
  }, []);


  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={(item, index) => `message-${index}`}
      style={styles.flatList}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={scrollToBottom}
      onLayout={scrollToBottom}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
    paddingHorizontal: 15,
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