/**
 * Shared TypeScript type definitions for the 20 Questions game.
 * Used by both React Native app and Supabase edge functions to ensure type safety.
 */

export type GameStatus = 'active' | 'won' | 'lost';
export type MessageRole = 'system' | 'user' | 'assistant';
export type MessageType = 'question' | 'answer' | 'hint' | 'guess';
export type AnswerType = 'chip' | 'text' | 'voice';
export type ThinkResultType = 'llm_win' | 'llm_loss';

/**
 * Enumeration of available game modes.
 */
export enum GameMode {
  /** Traditional mode where user asks questions and guesses AI's secret */
  USER_GUESSING = 'user_guessing',
  /** Think mode where AI asks questions and guesses user's secret */
  AI_GUESSING = 'ai_guessing'
}

/**
 * Type alias for backward compatibility with older code.
 */
export type GameModeType = GameMode;

/**
 * Array of all valid game modes for validation.
 */
export const GAME_MODES: GameMode[] = [GameMode.USER_GUESSING, GameMode.AI_GUESSING];

/**
 * Array of all valid game statuses for validation.
 */
export const GAME_STATUSES: GameStatus[] = ['active', 'won', 'lost'];

/**
 * Array of all valid answer types for validation.
 */
export const ANSWER_TYPES: AnswerType[] = ['chip', 'text', 'voice'];

/**
 * Array of all valid think mode result types for validation.
 */
export const THINK_RESULT_TYPES: ThinkResultType[] = ['llm_win', 'llm_loss'];

/**
 * Regular expression for validating UUID format.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a properly formatted UUID.
 */
export const isValidUUID = (value: string): boolean => UUID_REGEX.test(value);
/**
 * Type guard to validate game mode values.
 */
export const isValidGameMode = (value: string): value is GameMode => GAME_MODES.includes(value as GameMode);
/**
 * Type guard to validate answer type values.
 */
export const isValidAnswerType = (value: string): value is AnswerType => ANSWER_TYPES.includes(value as AnswerType);
/**
 * Type guard to validate think mode result types.
 */
export const isValidThinkResultType = (value: string): value is ThinkResultType => THINK_RESULT_TYPES.includes(value as ThinkResultType);

/**
 * Validates string input with configurable length constraints.
 */
export const isValidString = (value: any, minLength = 1, maxLength = 1000): boolean => {
  return typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;
};

/**
 * Validates if a category name is allowed in the game.
 */
export const isValidCategory = (value: string): boolean => {
  const allowedCategories = ['Animals', 'Food', 'Objects', 'Places', 'Random'];
  return allowedCategories.includes(value);
};

/**
 * Interface representing a game instance in the database.
 */
export interface Game {
  /** Unique identifier for the game */
  id: string;
  /** ID of the user who created the game */
  user_id: string;
  /** The secret item that needs to be guessed */
  secret_item: string;
  /** Category of the secret item */
  category: string;
  /** Current game mode */
  mode: GameMode;
  /** Number of questions asked so far */
  questions_asked: number;
  /** Number of hints used so far */
  hints_used: number;
  /** Current status of the game */
  status: GameStatus;
  /** Timestamp when the game was created */
  created_at: string;
}

/**
 * Interface representing a message in the game conversation.
 */
export interface GameMessage {
  /** Unique identifier for the message */
  id: string;
  /** ID of the game this message belongs to */
  game_id: string;
  /** Who sent the message (user, assistant, or system) */
  role: MessageRole;
  /** Text content of the message */
  content: string;
  /** Type of message (question, answer, hint, etc.) */
  message_type: MessageType;
  /** Sequential number of this question in the game */
  question_number: number;
  /** Timestamp when the message was created */
  created_at: string;
}

/**
 * Interface representing a game category with sample items.
 */
export interface Category {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Array of sample items that could be chosen from this category */
  sample_items: string[];
}

/**
 * Request interface for starting a new game.
 */
export interface StartGameRequest {
  /** Optional category name (random if not provided) */
  category?: string;
  /** Optional game mode (defaults to USER_GUESSING) */
  mode?: GameMode;
  /** Optional user ID (supports anonymous play) */
  user_id?: string;
}

/**
 * Response interface for game creation.
 */
export interface StartGameResponse {
  /** ID of the newly created game */
  game_id: string;
  /** Category that was selected for the game */
  category: string;
  /** Welcome message for the user */
  message: string;
}

/**
 * Request interface for asking a question in the game.
 */
export interface AskQuestionRequest {
  /** ID of the game to ask the question in */
  game_id: string;
  /** The question text from the user */
  question: string;
}

/**
 * Response interface for question answers.
 */
export interface AskQuestionResponse {
  /** AI's answer to the question */
  answer: string;
  /** Number of questions remaining */
  questions_remaining: number;
  /** Updated game status */
  game_status: GameStatus;
}

/**
 * Request interface for requesting a hint.
 */
export interface GetHintRequest {
  /** ID of the game to get a hint for */
  game_id: string;
}

/**
 * Response interface for hint generation.
 */
export interface GetHintResponse {
  /** Generated hint text */
  hint: string;
  /** Number of hints remaining */
  hints_remaining: number;
  /** Number of questions remaining (hint costs 1 question) */
  questions_remaining: number;
  /** Updated game status */
  game_status: GameStatus;
}

export interface QuitGameRequest {
  game_id: string;
}

export interface QuitGameResponse {
  message: string;
  secret_item: string;
}

// Think Mode specific types
export interface StartThinkRoundRequest {
  category: string;
  user_id?: string;
}

export interface StartThinkRoundResponse {
  session_id: string;
  category: string;
  first_question: string;
}

export interface LLMQuestionRequest {
  session_id: string;
}

export interface LLMQuestionResponse {
  question: string;
  questions_asked: number;
  questions_remaining: number;
}

export interface SubmitUserAnswerRequest {
  session_id: string;
  answer: string;
  answer_type: AnswerType;
}

export interface SubmitUserAnswerResponse {
  next_question?: string;
  questions_asked: number;
  questions_remaining: number;
  game_status: GameStatus;
}

export interface FinalizeThinkResultRequest {
  session_id: string;
  result: ThinkResultType;
}

export interface FinalizeThinkResultResponse {
  message: string;
  questions_used: number;
  secret_item?: string;
}

