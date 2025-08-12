import React from 'react';
import { TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

export const useGameNavigation = (
  navigation: GameScreenNavigationProp, 
  onQuit?: () => void
) => {
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
                  onQuit?.();
                  // Don't navigate back here - let the modal handle it when "Play Again" is clicked
                }
              } else {
                Alert.alert(
                  'Quit Game?',
                  'Are you sure you want to quit? Your progress will be lost.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Quit', 
                      style: 'destructive', 
                      onPress: () => {
                        onQuit?.();
                        // Don't navigate back here - let the modal handle it when "Play Again" is clicked
                      }
                    }
                  ]
                );
              }
            }}
            style={{
              paddingLeft: 8,
              paddingRight: 16,
              paddingVertical: 8,
              marginRight: 8,
              backgroundColor: '#ef4444',
              borderRadius: 8,
              cursor: Platform.OS === 'web' ? 'pointer' : undefined,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <Text style={{
              color: '#fff',
              fontSize: 15,
              fontWeight: '600',
            }}>Quit</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation, onQuit])
  );
};

