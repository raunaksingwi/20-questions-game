import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { gameService } from '../services/gameService';
import { GameMessage, GameStatus } from '../../../shared/types';
import { audioManager } from '../services/AudioManager';

type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;
type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

type Props = {
  route: GameScreenRouteProp;
  navigation: GameScreenNavigationProp;
};

export default function GameScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const [gameId, setGameId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [questionsRemaining, setQuestionsRemaining] = useState(20);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>('active');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    startNewGame();
    // Initialize audio manager
    audioManager.initialize();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Quit Game?',
                'Are you sure you want to quit? Your progress will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() }
                ]
              );
            }}
            style={{ paddingLeft: 15 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Quit</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation])
  );

  const startNewGame = async () => {
    try {
      setLoading(true);
      const response = await gameService.startGame(category);
      setGameId(response.game_id);
      
      // Play game start sound
      audioManager.playSound('gameStart');
      
      // Add welcome message
      const welcomeMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.message,
        message_type: 'answer',
      };
      setMessages([welcomeMessage as GameMessage]);
    } catch (error) {
      Alert.alert('Error', 'Failed to start game. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const sendQuestion = async () => {
    if (!gameId || !question.trim() || sending) return;

    // Play question sound
    audioManager.playSound('question');

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: question,
      message_type: 'question',
    };
    setMessages(prev => [...prev, userMessage as GameMessage]);
    setQuestion('');
    setSending(true);

    try {
      const response = await gameService.askQuestion(gameId, question);
      
      // Play appropriate sound based on answer
      const answerText = response.answer.toLowerCase();
      if (answerText.includes('yes') || answerText.startsWith('yes')) {
        audioManager.playSound('answerYes');
      } else if (answerText.includes('no') || answerText.startsWith('no')) {
        audioManager.playSound('answerNo');
      }
      
      const assistantMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.answer,
        message_type: 'answer',
      };
      setMessages(prev => [...prev, assistantMessage as GameMessage]);
      setQuestionsRemaining(response.questions_remaining);
      setGameStatus(response.game_status);

      if (response.game_status === 'won') {
        // Play victory sound
        audioManager.playSound('correct');
        Alert.alert(
          '🎉 Congratulations!',
          'You guessed it correctly!',
          [{ text: 'Play Again', onPress: () => navigation.goBack() }]
        );
      } else if (response.game_status === 'lost') {
        // Play loss sound
        audioManager.playSound('wrong');
        handleGameOver(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send question. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const requestHint = async () => {
    if (!gameId || hintsRemaining === 0 || sending) return;

    setSending(true);
    try {
      const response = await gameService.getHint(gameId);
      
      // Play hint sound
      audioManager.playSound('hint');
      
      const hintMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: `💡 Hint: ${response.hint}`,
        message_type: 'hint',
      };
      setMessages(prev => [...prev, hintMessage as GameMessage]);
      setHintsRemaining(response.hints_remaining);
      setQuestionsRemaining(response.questions_remaining);
      setGameStatus(response.game_status);

      if (response.game_status === 'lost') {
        // Play loss sound
        audioManager.playSound('wrong');
        handleGameOver(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get hint. Please try again.');
    } finally {
      setSending(false);
    }
  };


  const handleGameOver = (wasGuessed: boolean) => {
    if (!wasGuessed && gameStatus === 'lost') {
      Alert.alert(
        'Game Over!',
        'You\'ve used all 20 questions without guessing correctly.',
        [{ text: 'Play Again', onPress: () => navigation.goBack() }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Starting new game...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.categoryText}>Category: {category}</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>Questions: {questionsRemaining}/20</Text>
            <Text style={styles.statText}>Hints: {hintsRemaining}/3</Text>
          </View>
        </View>

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

        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a yes/no question or make a guess..."
              onSubmitEditing={sendQuestion}
              editable={!sending && gameStatus === 'active'}
              autoCapitalize="sentences"
            />
            <TouchableOpacity
              style={[styles.sendButton, (sending || gameStatus !== 'active') && styles.disabledButton]}
              onPress={sendQuestion}
              disabled={sending || !question.trim() || gameStatus !== 'active'}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.hintButton, (hintsRemaining === 0 || sending) && styles.disabledButton]}
              onPress={requestHint}
              disabled={hintsRemaining === 0 || sending || gameStatus !== 'active'}
            >
              <Text style={styles.hintButtonText}>
                💡 Get Hint ({hintsRemaining} left)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
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
  inputSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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