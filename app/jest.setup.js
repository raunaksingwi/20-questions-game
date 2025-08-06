// Mock expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => Promise.resolve({
    volume: 0.5,
    seekTo: jest.fn(),
    play: jest.fn(),
    release: jest.fn(),
    setOnPlaybackStatusUpdate: jest.fn(),
  })),
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    getPermissionsAsync: jest.fn(() => ({ granted: true })),
    requestPermissionsAsync: jest.fn(() => ({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    isRecognitionAvailable: jest.fn(() => true),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Gesture: {
      LongPress: () => ({
        minDuration: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({
        onEnd: jest.fn().mockReturnThis(),
      }),
      Exclusive: jest.fn(),
    },
    GestureDetector: View,
  };
});

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (callback) => callback(),
    withSpring: (value) => value,
    withTiming: (value) => value,
    runOnJS: (fn) => fn,
  };
});

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      getUser: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

// Silence console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[Reanimated]')) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[Reanimated]')) {
    return;
  }
  originalConsoleError(...args);
};

// Mock audio assets
jest.mock('../assets/sounds/gameStart.ogg', () => 'gameStart.ogg');
jest.mock('../assets/sounds/question.wav', () => 'question.wav');
jest.mock('../assets/sounds/correct.wav', () => 'correct.wav');
jest.mock('../assets/sounds/wrong.wav', () => 'wrong.wav');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Set up environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock WaveformVisualizer
jest.mock('./src/components/WaveformVisualizer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function WaveformVisualizer() {
    return React.createElement(View, { testID: 'waveform-visualizer' });
  };
});