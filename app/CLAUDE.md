# React Native App - CLAUDE.md

This directory contains the React Native Expo application for the 20 Questions game.

## Architecture Overview

This is a React Native app built with Expo SDK 53, using TypeScript and modern React patterns including hooks and context for state management.

### Key Technologies

- **React Native**: 0.79.5 with React 19.0.0
- **Expo**: ~53.0.20 for development and building
- **TypeScript**: ~5.8.3 for type safety
- **Navigation**: React Navigation 7 with stack navigator
- **State Management**: React hooks (useState, useContext, useReducer)
- **Backend Integration**: Supabase client for real-time database
- **Testing**: Jest with React Native Testing Library
- **Voice Input**: Expo Speech Recognition
- **Audio**: Expo Haptics for feedback
- **Storage**: Expo Secure Store and AsyncStorage

## Project Structure

```
app/
├── src/
│   ├── screens/           # Main application screens
│   │   ├── HomeScreen.tsx     # Category selection and game start
│   │   └── GameScreen.tsx     # Main game interface
│   ├── components/        # Reusable UI components
│   │   ├── GameHeader.tsx     # Game status and controls
│   │   ├── GameInput.tsx      # Text/voice input component
│   │   ├── MessagesList.tsx   # Chat-like conversation display
│   │   ├── LoadingScreen.tsx  # Loading states
│   │   └── voice/             # Voice input components
│   ├── hooks/             # Custom React hooks
│   │   ├── useGameState.ts    # Game state management
│   │   ├── useGameActions.ts  # Game action handlers
│   │   └── useVoiceRecording.ts # Voice input logic
│   ├── services/          # External service integrations
│   │   ├── supabase.ts        # Supabase client configuration
│   │   ├── gameService.ts     # Game API calls
│   │   └── AudioManager.ts    # Audio feedback management
│   ├── navigation/        # App navigation setup
│   │   └── AppNavigator.tsx   # Main navigation stack
│   ├── types/             # App-specific TypeScript types
│   │   └── types.ts           # Local type definitions
│   ├── constants/         # App constants and configuration
│   └── utils/             # Utility functions
├── assets/                # Static assets (icons, images)
├── android/               # Native Android configuration
├── ios/                   # Native iOS configuration
└── __tests__/             # Test files and mocks
```

## Key Components

### Screens

- **HomeScreen**: Category selection, game mode selection, start new game
- **GameScreen**: Main game interface with conversation view and input

### Core Components

- **GameHeader**: Displays remaining questions, hints available, game controls
- **GameInput**: Handles both text and voice input with send button
- **MessagesList**: Chat-like interface showing conversation history
- **VoiceInputButton**: Professional voice recording interface
- **LoadingScreen**: Skeleton loading states during game initialization

### Custom Hooks

- **useGameState**: Manages game state (questions, hints, messages, status)
- **useGameActions**: Handles game actions (ask question, get hint, make guess)
- **useVoiceRecording**: Manages voice input recording and speech recognition
- **useGameNavigation**: Navigation helpers and screen transitions

## Services

### Supabase Integration

The app connects to Supabase for:
- **Authentication**: Anonymous and authenticated users
- **Real-time Database**: Game state and conversation history
- **Edge Functions**: Game logic processing

Configuration in `src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Game Service

`src/services/gameService.ts` provides high-level game operations:
- `startGame(category)`: Creates new game
- `askQuestion(gameId, question)`: Sends question to AI
- `getHint(gameId)`: Requests contextual hint
- `makeGuess(gameId, guess)`: Makes final guess

## State Management

The app uses React hooks for state management:

### Game State Structure
```typescript
interface GameState {
  gameId: string | null
  secretItem: string | null
  category: string | null
  questionsAsked: number
  hintsUsed: number
  gameStatus: 'active' | 'won' | 'lost' | 'loading'
  messages: GameMessage[]
  isLoading: boolean
}
```

### Message Types
```typescript
interface GameMessage {
  id: string
  text: string
  type: 'user' | 'ai' | 'system'
  timestamp: Date
  isGuess?: boolean
}
```

## Voice Input System

The app features a sophisticated voice input system:

### Components
- **ProfessionalVoiceButton**: Main voice recording button
- **ExpandingWaveVisualizer**: Visual feedback during recording
- **VoiceDiagnosticsDashboard**: Debugging interface for voice issues

### Features
- **Speech Recognition**: Using Expo Speech Recognition
- **Visual Feedback**: Animated waveform during recording
- **Error Handling**: Graceful fallback to text input
- **Permissions**: Microphone permission management

## Testing

### Test Setup
- **Jest**: Test runner with React Native preset
- **React Native Testing Library**: Component testing utilities
- **MSW**: API mocking for Supabase calls
- **Coverage**: Configured for 80%+ test coverage

### Test Categories
- **Component Tests**: UI behavior and user interactions
- **Hook Tests**: Custom hook logic and state updates
- **Service Tests**: API integration and error handling
- **Integration Tests**: Full user flows

### Running Tests
```bash
cd app
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

## Build Configuration

### Development
```bash
npm start                # Start Expo development server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in web browser
```

### Production Builds
```bash
npm run build:ios              # Build iOS IPA
npm run build:android:release  # Build Android APK
npm run build:android:bundle   # Build Android AAB
```

## Environment Configuration

Create `.env` file with:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Performance Optimizations

### React Performance
- **Component Memoization**: Using React.memo for expensive components
- **Hook Optimization**: useCallback and useMemo for expensive operations
- **State Updates**: Batched updates to prevent unnecessary rerenders

### Audio Management
- **Haptic Feedback**: Strategic use for user feedback
- **Memory Management**: Proper cleanup of audio resources
- **Background Handling**: Graceful handling of app backgrounding

### Network Optimization
- **Request Deduplication**: Prevents duplicate API calls
- **Caching**: Local storage for game state
- **Error Recovery**: Automatic retry logic for failed requests

## Common Development Tasks

### Adding New Components
1. Create component in appropriate directory under `src/components/`
2. Add TypeScript interface for props
3. Create corresponding test file in `__tests__/`
4. Export from appropriate index file

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add to navigation stack in `AppNavigator.tsx`
3. Create test file for screen behavior
4. Update type definitions if needed

### Integrating New APIs
1. Add service function in `src/services/`
2. Create custom hook if complex state management needed
3. Add error handling and loading states
4. Write tests for both happy path and error cases

## Debugging

### Common Issues
- **Metro bundler**: Clear cache with `npx expo start -c`
- **Native modules**: Run `npx expo prebuild --clean`
- **iOS builds**: Check Xcode configuration and certificates
- **Android builds**: Verify Gradle and SDK versions

### Development Tools
- **Expo Dev Client**: For testing native features
- **React Native Debugger**: For component inspection
- **Flipper**: For advanced debugging (optional)

## Dependencies

### Core Dependencies
- **@supabase/supabase-js**: Backend integration
- **@react-navigation/native**: Navigation framework
- **expo-speech-recognition**: Voice input functionality
- **react-native-reanimated**: Smooth animations

### Development Dependencies
- **@testing-library/react-native**: Component testing
- **jest**: Test runner and assertions
- **typescript**: Type checking and development experience

For complete dependency list, see `package.json`.