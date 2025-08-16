/**
 * Home screen where users select game mode and category to start a new game.
 * Features animated transitions between different game modes and category selection.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category, GameMode } from '../types/types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const CATEGORIES = [
  { id: '1', name: 'Animals' },
  { id: '2', name: 'Objects' },
  { id: '3', name: 'Cricket Players' },
  { id: '4', name: 'Football Players' },
  { id: '5', name: 'NBA Players' },
  { id: '6', name: 'World Leaders' },
];

/**
 * Main component that renders the home screen with game mode selection and category grid.
 * Handles navigation to the game screen with selected parameters.
 */
export default function HomeScreen({ navigation }: Props) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.USER_GUESSING);
  
  const screenWidth = Dimensions.get('window').width;
  
  // Animation values for categories slide-in
  const categoriesTranslateX = useSharedValue(0);
  const categoriesOpacity = useSharedValue(1);
  
  // Trigger animation when mode changes
  useEffect(() => {
    // Slide out to the right, then slide in from the left
    categoriesOpacity.value = withTiming(0.3, { duration: 200 });
    categoriesTranslateX.value = withTiming(screenWidth * 0.3, { duration: 200 }, () => {
      // Reset position off-screen left, then slide in
      categoriesTranslateX.value = -screenWidth * 0.3;
      categoriesTranslateX.value = withTiming(0, { duration: 300 });
      categoriesOpacity.value = withTiming(1, { duration: 300 });
    });
  }, [selectedMode, screenWidth]);
  
  // Animated style for categories
  const categoriesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: categoriesTranslateX.value }],
    opacity: categoriesOpacity.value,
  }));


  /**
   * Initiates a new game with the selected category and current game mode.
   * Navigates to the GameScreen with the selected parameters.
   */
  const startGame = (category: string) => {
    console.log(`[HomeScreen] Starting game with category: ${category}, mode: ${selectedMode}`);
    const startTime = Date.now();
    navigation.navigate('Game', { category, mode: selectedMode });
    console.log(`[HomeScreen] Navigation to Game screen in ${Date.now() - startTime}ms`);
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to 20 Questions!</Text>
          <Text style={styles.subtitle}>
            Choose how you want to play!
          </Text>
        </View>

        <View style={styles.modeContainer}>
          <Text style={styles.sectionTitle}>Game Mode</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                selectedMode === GameMode.USER_GUESSING && styles.modeButtonActive,
              ]}
              onPress={() => setSelectedMode(GameMode.USER_GUESSING)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.modeButtonText,
                selectedMode === GameMode.USER_GUESSING && styles.modeButtonTextActive,
              ]}>
                I'm Guessing
              </Text>
              <Text style={styles.modeDescription}>
                AI picks a secret - I ask questions to guess it!
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                selectedMode === GameMode.AI_GUESSING && styles.modeButtonActive,
              ]}
              onPress={() => setSelectedMode(GameMode.AI_GUESSING)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.modeButtonText,
                selectedMode === GameMode.AI_GUESSING && styles.modeButtonTextActive,
              ]}>
                AI is Guessing
              </Text>
              <Text style={styles.modeDescription}>
                I think of a secret - AI asks questions to guess it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.categoriesContainer, categoriesAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Choose a Category</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryButton, screenWidth >= 400 && styles.categoryButtonGrid]}
                onPress={() => startGame(category.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>How to Play {selectedMode === GameMode.USER_GUESSING ? "I'm Guessing" : 'AI is Guessing'} Mode</Text>
          <Text style={styles.rulesText}>
            {selectedMode === GameMode.USER_GUESSING ? (
              `1. AI picks a secret from the chosen category\n2. Ask yes/no questions to narrow it down\n3. You have 20 questions to guess correctly\n4. You can request up to 3 hints (each hint costs 1 question)\n5. Make your final guess when you think you know!`
            ) : (
              `1. Think of something from the chosen category\n2. AI asks up to 20 yes/no questions to guess it\n3. Answer with Yes, No, Maybe, Don't know, or Irrelevant\n4. Press WIN if AI guesses correctly before 20 questions\n5. If AI uses all 20 questions without guessing, you win!`
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modeContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f9ff',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  modeButtonTextActive: {
    color: '#6366f1',
  },
  modeDescription: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoriesContainer: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: '100%',
  },
  categoryButtonGrid: {
    width: '48%',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  rulesContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5b21b6',
    marginBottom: 10,
  },
  rulesText: {
    fontSize: 14,
    color: '#6b21a8',
    lineHeight: 22,
  },
});