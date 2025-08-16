/**
 * Main navigation setup for the 20 Questions game app.
 * Defines the navigation stack and screen routing between Home and Game screens.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import GameScreen from '../screens/GameScreen';
import { GameMode } from '../types/types';

export type RootStackParamList = {
  Home: undefined;
  Game: { category: string; mode: GameMode };
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Creates and configures the main navigation container for the app.
 * Sets up stack navigation with consistent header styling.
 */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: '20 Questions' }}
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen} 
          options={{ title: 'Ask Your Questions' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}