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
import { Category, GameMode } from '../../../shared/types';
import { gameService } from '../services/gameService';
import CategorySkeleton from '../components/CategorySkeleton';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<GameMode>('guess');
  
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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const startTime = Date.now();
      console.log('[HomeScreen] Loading categories...');
      const data = await gameService.getCategories();
      console.log(`[HomeScreen] Categories loaded in ${Date.now() - startTime}ms`);
      setCategories(data);
    } catch (error) {
      console.error('[HomeScreen] Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = (category: string) => {
    console.log(`[HomeScreen] Starting game with category: ${category}, mode: ${selectedMode}`);
    const startTime = Date.now();
    navigation.navigate('Game', { category, mode: selectedMode });
    console.log(`[HomeScreen] Navigation to Game screen in ${Date.now() - startTime}ms`);
  };

  if (loading) {
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
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Choose a Category</Text>
          </View>
          <CategorySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
                selectedMode === 'guess' && styles.modeButtonActive,
              ]}
              onPress={() => setSelectedMode('guess')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.modeButtonText,
                selectedMode === 'guess' && styles.modeButtonTextActive,
              ]}>
                Guess
              </Text>
              <Text style={styles.modeDescription}>
                I'll think of something - you guess it!
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                selectedMode === 'think' && styles.modeButtonActive,
              ]}
              onPress={() => setSelectedMode('think')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.modeButtonText,
                selectedMode === 'think' && styles.modeButtonTextActive,
              ]}>
                Think
              </Text>
              <Text style={styles.modeDescription}>
                You think of something - I'll guess it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.categoriesContainer, categoriesAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Choose a Category</Text>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryButton}
              onPress={() => startGame(category.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription}>
                {category.name === 'Random' 
                  ? 'I can think of anything!'
                  : `Examples: ${category.sample_items.slice(0, 3).join(', ')}...`
                }
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>How to Play {selectedMode === 'guess' ? 'Guess' : 'Think'} Mode</Text>
          <Text style={styles.rulesText}>
            {selectedMode === 'guess' ? (
              `1. I'll think of something from the chosen category\n2. Ask me yes/no questions to narrow it down\n3. You have 20 questions to guess correctly\n4. You can request up to 3 hints (each hint costs 1 question)\n5. Make your final guess when you think you know!`
            ) : (
              `1. Think of something from the chosen category\n2. I'll ask up to 20 yes/no questions to guess it\n3. Answer with Yes, No, Maybe, Don't know, or Irrelevant\n4. Press WIN if I guess correctly before 20 questions\n5. If I use all 20 questions without guessing, you win!`
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