import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
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
  const { category } = route.params;
  const [question, setQuestion] = useState('');
  
  const { state, actions } = useGameState();
  const gameActions = useGameActions(state, actions);
  
  useGameNavigation(navigation);

  useEffect(() => {
    gameActions.startNewGame(category, () => navigation.goBack());
    audioManager.initialize();
  }, []);

  const handleVoiceSubmit = (voiceText: string) => {
    console.log('🎬 GameScreen: Voice text received:', voiceText);
    console.log('🎬 GameScreen: Voice text length:', voiceText.length, 'words:', voiceText.split(' ').length);
    gameActions.sendQuestion(voiceText, question);
    setQuestion('');
  };

  const handleTextSubmit = () => {
    gameActions.sendQuestion(undefined, question);
    setQuestion('');
  };

  const handleResultModalClose = () => {
    actions.setShowResultModal(false);
    navigation.goBack();
  };

  if (state.loading) {
    return <LoadingGame />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <GameHeader
          category={category}
          questionsRemaining={state.questionsRemaining}
          hintsRemaining={state.hintsRemaining}
        />

        <MessagesList
          messages={state.messages}
          sending={state.sending}
        />

        <GameInput
          question={question}
          setQuestion={setQuestion}
          sending={state.sending}
          gameStatus={state.gameStatus}
          hintsRemaining={state.hintsRemaining}
          onTextSubmit={handleTextSubmit}
          onVoiceSubmit={handleVoiceSubmit}
          onRequestHint={gameActions.requestHint}
        />
        
        <GameResultModal
          visible={state.showResultModal}
          isWin={state.resultModalData.isWin}
          title={state.resultModalData.title}
          message={state.resultModalData.message}
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
});