import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { audioManager } from '../services/AudioManager';
import GameResultModal from '../components/GameResultModal';
import { useGameState } from '../hooks/useGameState';
import { useGameActions } from '../hooks/useGameActions';
import { useGameNavigation } from '../hooks/useGameNavigation';
import { GameHeader } from '../components/GameHeader';
import { MessagesList } from '../components/MessagesList';
import { GameInput } from '../components/GameInput';
import { LoadingGame } from '../components/LoadingGame';

type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;
type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

type Props = {
  route: GameScreenRouteProp;
  navigation: GameScreenNavigationProp;
};


export default function GameScreen({ route, navigation }: Props) {
  const { category, mode } = route.params;
  const [question, setQuestion] = useState('');
  const insets = useSafeAreaInsets();
  
  const { state, actions } = useGameState();
  const gameActions = useGameActions(state, actions);
  
  // Remove navigation header buttons entirely - GameHeader handles all action buttons
  useGameNavigation(
    navigation, 
    undefined, // No quit in navigation header
    undefined, // No hint in navigation header
    state.hintsRemaining,
    state.sending,
    false // No header buttons - GameHeader handles everything
  );

  useEffect(() => {
    gameActions.startNewGame(category, mode, () => navigation.goBack());
  }, []);

  const handleVoiceSubmit = (voiceText: string) => {
    console.log('🎬 GameScreen: Voice text received:', voiceText);
    console.log('🎬 GameScreen: Voice text length:', voiceText.length, 'words:', voiceText.split(' ').length);
    
    if (mode === 'think') {
      gameActions.submitUserAnswer(voiceText, 'voice');
    } else {
      gameActions.sendQuestion(voiceText, question);
    }
    setQuestion('');
  };

  const handleTextSubmit = () => {
    const textToSubmit = question.trim();
    if (!textToSubmit) return;

    if (mode === 'think') {
      gameActions.submitUserAnswer(textToSubmit, 'text');
    } else {
      gameActions.sendQuestion(undefined, question);
    }
    setQuestion('');
  };

  const handleResultModalClose = () => {
    actions.setShowResultModal(false);
    navigation.goBack();
  };

  const handleWinPress = () => {
    console.log('WIN button pressed - Think mode victory');
    gameActions.handleWin();
  };

  const handleQuickAnswer = (answer: string, type: string) => {
    console.log(`Quick answer: ${answer} (${type})`);
    gameActions.submitUserAnswer(answer, 'chip');
    setQuestion('');
  };

  if (state.loading) {
    return <LoadingGame />;
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header - Absolutely positioned at top */}
      <View 
        style={[styles.headerContainer, { paddingTop: insets.top }]}
        accessibilityRole="header"
        accessibilityLabel="Game information header"
      >
        <GameHeader
          category={category}
          questionsRemaining={state.questionsRemaining}
          hintsRemaining={state.hintsRemaining}
          mode={mode}
          questionsAsked={20 - state.questionsRemaining} // Convert remaining to asked
          onWinPress={mode === 'think' ? undefined : handleWinPress} // No WIN button in Think mode header
          onHintPress={gameActions.requestHint}
          onQuitPress={gameActions.handleQuit}
          disabled={state.sending || state.gameStatus !== 'active'}
        />
      </View>

      {/* Scrollable Messages Area - Absolutely positioned between header and footer */}
      <View 
        style={[
          styles.messagesContainer,
          {
            top: 65 + insets.top, // Header height + safe area
            bottom: 120 + insets.bottom, // Footer height + safe area
          }
        ]}
        accessibilityLabel="Game conversation"
      >
        <MessagesList
          messages={state.messages}
          sending={state.sending}
        />
      </View>

      {/* Fixed Footer - Absolutely positioned at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.footerContainer, { paddingBottom: insets.bottom }]}
        keyboardVerticalOffset={0}
      >
        <View 
          accessibilityRole="toolbar"
          accessibilityLabel="Question input area"
        >
          <GameInput
            question={question}
            setQuestion={setQuestion}
            sending={state.sending}
            gameStatus={state.gameStatus}
            mode={mode}
            onTextSubmit={handleTextSubmit}
            onVoiceSubmit={handleVoiceSubmit}
            onQuickAnswer={handleQuickAnswer}
            onWinPress={handleWinPress}
          />
        </View>
      </KeyboardAvoidingView>
        
      <GameResultModal
        visible={state.showResultModal}
        isWin={state.resultModalData.isWin}
        title={state.resultModalData.title}
        message={state.resultModalData.message}
        buttonText="Play Again"
        onButtonPress={handleResultModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 1000,
    // Platform-specific shadows inline
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  messagesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#f3f4f6',
    // top and bottom will be set dynamically with safe area insets
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    zIndex: 1000,
    // Platform-specific shadows inline
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
});