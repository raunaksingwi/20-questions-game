import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category } from '../../../shared/types';
import { gameService } from '../services/gameService';
import CategorySkeleton from '../components/CategorySkeleton';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await gameService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = (category: string) => {
    navigation.navigate('Game', { category });
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
              I'll think of something from your chosen category - try to guess it!
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
            I'll think of something from your chosen category - try to guess it!
          </Text>
        </View>

        <View style={styles.categoriesContainer}>
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
        </View>

        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>How to Play</Text>
          <Text style={styles.rulesText}>
            1. I'll think of something from the chosen category{'\n'}
            2. Ask me yes/no questions to narrow it down{'\n'}
            3. You have 20 questions to guess correctly{'\n'}
            4. You can request up to 3 hints (each hint costs 1 question){'\n'}
            5. Make your final guess when you think you know!
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
  categoriesContainer: {
    padding: 20,
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