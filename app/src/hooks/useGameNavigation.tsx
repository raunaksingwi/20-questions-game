import React from 'react';
import { TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

export const useGameNavigation = (navigation: GameScreenNavigationProp) => {
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerRight: () => (
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
            style={{
              paddingLeft: 8,
              paddingRight: 16,
              paddingVertical: 8,
              marginRight: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              cursor: Platform.OS === 'web' ? 'pointer' : undefined,
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
    }, [navigation])
  );
};

