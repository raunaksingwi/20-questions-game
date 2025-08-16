# Shared Types - CLAUDE.md

This directory contains TypeScript type definitions shared between the React Native app and Supabase edge functions.

## Purpose

The shared types ensure type safety and consistency across the entire application stack:
- **Frontend**: React Native app uses these types for API calls and state management
- **Backend**: Supabase edge functions use these types for request/response validation
- **Testing**: Both test suites use these types for mock data and assertions

## Type Categories

### Core Game Types

#### Game Status and Modes
```typescript
export type GameStatus = 'active' | 'won' | 'lost';
export enum GameMode {
  USER_GUESSING = 'user_guessing',    // Traditional mode: user guesses AI's item
  AI_GUESSING = 'ai_guessing'         // Think mode: AI guesses user's item
}
```

#### Message and Communication Types
```typescript
export type MessageRole = 'system' | 'user' | 'assistant';
export type MessageType = 'question' | 'answer' | 'hint' | 'guess';
export type AnswerType = 'chip' | 'text' | 'voice';  // How user provided their answer
export type ThinkResultType = 'llm_win' | 'llm_loss';  // Think mode outcomes
```

### Core Data Models

#### Game Entity
```typescript
export interface Game {
  id: string;              // UUID for game instance
  user_id: string;         // User identifier (can be anonymous)
  secret_item: string;     // The item to be guessed
  category: string;        // Game category (Animals, Food, etc.)
  mode: GameMode;          // Game mode (user_guessing or ai_guessing)
  questions_asked: number; // Number of questions used
  hints_used: number;      // Number of hints requested
  status: GameStatus;      // Current game state
  created_at: string;      // Game creation timestamp
}
```

#### Message Entity
```typescript
export interface GameMessage {
  id: string;              // Unique message identifier
  game_id: string;         // Reference to parent game
  role: MessageRole;       // Who sent the message
  content: string;         // Message text content
  message_type: MessageType; // Type of message
  question_number: number; // Sequential question number
  created_at: string;      // Message timestamp
}
```

#### Category Configuration
```typescript
export interface Category {
  id: string;              // Category identifier
  name: string;            // Display name
  sample_items: string[];  // Example items for this category
}
```

### API Request/Response Types

#### Game Management
```typescript
// Starting a new game
export interface StartGameRequest {
  category?: string;       // Optional category selection
  mode?: GameMode;         // Optional mode selection
  user_id?: string;        // Optional user identifier
}

export interface StartGameResponse {
  game_id: string;         // New game identifier
  category: string;        // Selected category
  message: string;         // Welcome message
}

// Asking questions
export interface AskQuestionRequest {
  game_id: string;         // Game to ask question in
  question: string;        // User's question
}

export interface AskQuestionResponse {
  answer: string;          // AI's response
  questions_remaining: number; // Questions left
  game_status: GameStatus; // Updated game status
}

// Getting hints
export interface GetHintRequest {
  game_id: string;         // Game to get hint for
}

export interface GetHintResponse {
  hint: string;            // Generated hint
  hints_remaining: number; // Hints left
  questions_remaining: number; // Questions left (hint costs 1)
  game_status: GameStatus; // Updated game status
}

// Quitting game
export interface QuitGameRequest {
  game_id: string;         // Game to quit
}

export interface QuitGameResponse {
  message: string;         // Quit confirmation
  secret_item: string;     // Reveal the answer
}
```

#### Think Mode API Types
```typescript
// Starting think mode session
export interface StartThinkRoundRequest {
  category: string;        // Category for AI to choose from
  user_id?: string;        // Optional user identifier
}

export interface StartThinkRoundResponse {
  session_id: string;      // Think session identifier
  category: string;        // Confirmed category
  first_question: string;  // AI's first question
}

// Submitting answers to AI questions
export interface SubmitUserAnswerRequest {
  session_id: string;      // Active think session
  answer: string;          // User's answer (yes/no)
  answer_type: AnswerType; // How answer was provided
}

export interface SubmitUserAnswerResponse {
  next_question?: string;  // AI's next question (if game continues)
  questions_asked: number; // Total questions asked
  questions_remaining: number; // Questions remaining
  game_status: GameStatus; // Current game status
}

// Finalizing think mode results
export interface FinalizeThinkResultRequest {
  session_id: string;      // Session to finalize
  result: ThinkResultType; // Whether AI won or lost
}

export interface FinalizeThinkResultResponse {
  message: string;         // Result message
  questions_used: number;  // Total questions used
  secret_item?: string;    // User's secret item (if AI lost)
}
```

## Validation Utilities

The types include built-in validation functions for runtime type checking:

### UUID Validation
```typescript
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isValidUUID = (value: string): boolean => UUID_REGEX.test(value);
```

### Enum Validation
```typescript
export const GAME_MODES: GameMode[] = [GameMode.USER_GUESSING, GameMode.AI_GUESSING];
export const isValidGameMode = (value: string): value is GameMode => 
  GAME_MODES.includes(value as GameMode);

export const ANSWER_TYPES: AnswerType[] = ['chip', 'text', 'voice'];
export const isValidAnswerType = (value: string): value is AnswerType => 
  ANSWER_TYPES.includes(value as AnswerType);
```

### String Validation
```typescript
export const isValidString = (value: any, minLength = 1, maxLength = 1000): boolean => {
  return typeof value === 'string' && 
         value.trim().length >= minLength && 
         value.length <= maxLength;
};
```

### Category Validation
```typescript
export const isValidCategory = (value: string): boolean => {
  const allowedCategories = ['Animals', 'Food', 'Objects', 'Places', 'Random'];
  return allowedCategories.includes(value);
};
```

## Usage Patterns

### In React Native App
```typescript
import { Game, GameMessage, AskQuestionRequest } from '../shared/types';

// Type-safe API calls
const askQuestion = async (gameId: string, question: string): Promise<AskQuestionResponse> => {
  const request: AskQuestionRequest = { game_id: gameId, question };
  return await gameService.askQuestion(request);
};

// Type-safe state management
const [game, setGame] = useState<Game | null>(null);
const [messages, setMessages] = useState<GameMessage[]>([]);
```

### In Edge Functions
```typescript
import { StartGameRequest, StartGameResponse, isValidUUID } from '../shared/types';

export default async function startGame(req: Request): Promise<Response> {
  const body: StartGameRequest = await req.json();
  
  // Runtime validation
  if (body.user_id && !isValidUUID(body.user_id)) {
    return new Response('Invalid user ID', { status: 400 });
  }
  
  // Type-safe response
  const response: StartGameResponse = {
    game_id: newGameId,
    category: selectedCategory,
    message: 'Game started!'
  };
  
  return new Response(JSON.stringify(response));
}
```

### In Tests
```typescript
import { Game, GameMode, GameStatus } from '../shared/types';

// Mock data with proper types
const mockGame: Game = {
  id: 'test-game-id',
  user_id: 'test-user-id',
  secret_item: 'elephant',
  category: 'Animals',
  mode: GameMode.USER_GUESSING,
  questions_asked: 5,
  hints_used: 1,
  status: 'active' as GameStatus,
  created_at: '2024-01-01T00:00:00Z'
};
```

## Evolution and Versioning

### Adding New Types
1. Add the new type definition to `types.ts`
2. Add validation functions if applicable
3. Update both app and backend code to use new types
4. Add tests for the new types
5. Update documentation

### Backward Compatibility
- Use optional properties for new fields
- Provide default values where appropriate
- Maintain existing type names and structures
- Use type aliases for renamed types

### Breaking Changes
- Update version number in comments
- Coordinate updates across app and backend
- Provide migration guides for complex changes
- Test thoroughly in staging environment

## Type Safety Benefits

### Compile-time Checking
- Catches type mismatches during development
- Prevents undefined property access
- Ensures consistent API contracts
- Reduces runtime errors

### IDE Support
- Auto-completion for object properties
- Inline documentation via TypeScript
- Refactoring safety across the codebase
- Better debugging experience

### API Contract Enforcement
- Ensures frontend and backend agree on data shapes
- Validates request/response structures
- Prevents data serialization issues
- Maintains consistency across deployments

## Common Patterns

### Optional Properties
Use optional properties for fields that may not always be present:
```typescript
export interface StartGameRequest {
  category?: string;     // Optional - system can choose default
  mode?: GameMode;       // Optional - defaults to USER_GUESSING
  user_id?: string;      // Optional - supports anonymous play
}
```

### Union Types
Use union types for controlled vocabularies:
```typescript
export type GameStatus = 'active' | 'won' | 'lost';
export type MessageRole = 'system' | 'user' | 'assistant';
```

### Type Guards
Use type guards for runtime validation:
```typescript
export const isValidGameMode = (value: string): value is GameMode => {
  return GAME_MODES.includes(value as GameMode);
};
```

This shared type system ensures consistency, type safety, and maintainability across the entire 20 Questions application.