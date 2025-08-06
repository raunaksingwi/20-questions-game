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
  StatusBar,
  Dimensions,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { gameService } from '../services/gameService';
import { GameMessage, GameStatus } from '../../../shared/types';
import { audioManager } from '../services/AudioManager';
import VoiceInputButton from '../components/VoiceInputButton';
import GameResultModal from '../components/GameResultModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;
type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

type Props = {
  route: GameScreenRouteProp;
  navigation: GameScreenNavigationProp;
};


export default function GameScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const insets = useSafeAreaInsets();
  const [gameId, setGameId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [questionsRemaining, setQuestionsRemaining] = useState(20);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>('active');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState({ isWin: false, title: '', message: '' });
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
              if (Platform.OS === 'web') {
                if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
                  navigation.goBack();
                }
              } else {
                Alert.alert(
                  'Quit Game?',
                  'Are you sure you want to quit? Your progress will be lost.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() }
                  ]
                );
              }
            }}
            style={styles.quitButton}
          >
            <Text style={styles.quitButtonText}>Quit</Text>
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

  const sendQuestion = async (questionText?: string) => {
    const textToSend = questionText || question;
    if (!gameId || !textToSend.trim() || sending) return;

    // Question sound removed per user request

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: textToSend,
      message_type: 'question',
    };
    setMessages(prev => [...prev, userMessage as GameMessage]);
    setQuestion('');
    setSending(true);

    try {
      const response = await gameService.askQuestion(gameId, textToSend);
      
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
        setResultModalData({
          isWin: true,
          title: 'Congratulations!',
          message: 'You guessed it correctly! Well done!'
        });
        setShowResultModal(true);
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

  const handleVoiceSubmit = (voiceText: string) => {
    sendQuestion(voiceText);
  };

  const handleTextSubmit = () => {
    sendQuestion();
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
      setResultModalData({
        isWin: false,
        title: 'Game Over!',
        message: "You've used all 20 questions without guessing correctly. Better luck next time!"
      });
      setShowResultModal(true);
    }
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
    navigation.goBack();
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

        <View style={[styles.inputSection, { paddingBottom: insets.bottom }]}>
          <View style={styles.inputContainer}>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask a yes/no question or make a guess..."
                onSubmitEditing={handleTextSubmit}
                editable={!sending && gameStatus === 'active'}
                autoCapitalize="sentences"
              />
            </View>
            <View style={styles.voiceButtonContainer}>
              <VoiceInputButton
                onTextSubmit={handleTextSubmit}
                onVoiceSubmit={handleVoiceSubmit}
                inputText={question}
                setInputText={setQuestion}
                disabled={sending || gameStatus !== 'active'}
              />
            </View>
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
        
        <GameResultModal
          visible={showResultModal}
          isWin={resultModalData.isWin}
          title={resultModalData.title}
          message={resultModalData.message}
          buttonText="Play Again"
          onButtonPress={handleResultModalClose}
        />
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
  },
  inputContainer: {
    position: 'relative', // Make this the positioning context
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
    paddingRight: 50, // Reduced padding since button is flush with edge
    paddingVertical: 12,
    fontSize: 16,
    height: 44,
  },
  voiceButtonContainer: {
    position: 'absolute',
    right: 17, // Align with text input right edge (padding 15 + margin 2)
    top: 12, // Align with text input top
    height: 44, // Match text input height
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 10,
    pointerEvents: 'box-none', // Allow touches to pass through when not recording
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
  quitButton: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  quitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});