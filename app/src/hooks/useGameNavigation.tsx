import React from 'react';
import { TouchableOpacity, Text, Platform, Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

export const useGameNavigation = (
  navigation: GameScreenNavigationProp, 
  onQuit?: () => void,
  onRequestHint?: () => void,
  hintsRemaining?: number,
  sending?: boolean,
  showHeaderButtons?: boolean
) => {
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerLeft: () => null,
        headerRight: () => showHeaderButtons ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Hint Button - only show if onRequestHint is provided */}
            {onRequestHint && (
              <TouchableOpacity
                onPress={onRequestHint}
                disabled={!hintsRemaining || sending}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginRight: 8,
                  backgroundColor: (!hintsRemaining || sending) ? '#9ca3af' : '#fbbf24',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: Platform.OS === 'web' ? 'pointer' : undefined,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Text style={{
                  color: (!hintsRemaining || sending) ? '#6b7280' : '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                }}>
                  {hintsRemaining ? `Hint (${hintsRemaining})` : 'Hint'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Quit Button - only show if onQuit is provided */}
            {onQuit && (
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
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginRight: 8,
                backgroundColor: '#ef4444',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
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
            )}
          </View>
        ) : null,
      });
    }, [navigation, onQuit, onRequestHint, hintsRemaining, sending, showHeaderButtons])
  );
};

