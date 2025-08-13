export type GameStatus = 'active' | 'won' | 'lost';
export type MessageRole = 'system' | 'user' | 'assistant';
export type MessageType = 'question' | 'answer' | 'hint' | 'guess';
export type AnswerType = 'chip' | 'text' | 'voice';
export type ThinkResultType = 'llm_win' | 'llm_loss';

// Game Mode Enum
export enum GameMode {
  USER_GUESSING = 'user_guessing',
  AI_GUESSING = 'ai_guessing'
}

// Type alias for backward compatibility
export type GameModeType = GameMode;

// Validation helpers
export const GAME_MODES: GameMode[] = [GameMode.USER_GUESSING, GameMode.AI_GUESSING];
export const GAME_STATUSES: GameStatus[] = ['active', 'won', 'lost'];
export const ANSWER_TYPES: AnswerType[] = ['chip', 'text', 'voice'];
export const THINK_RESULT_TYPES: ThinkResultType[] = ['llm_win', 'llm_loss'];

// UUID validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Input validation functions
export const isValidUUID = (value: string): boolean => UUID_REGEX.test(value);
export const isValidGameMode = (value: string): value is GameMode => GAME_MODES.includes(value as GameMode);
export const isValidAnswerType = (value: string): value is AnswerType => ANSWER_TYPES.includes(value as AnswerType);
export const isValidThinkResultType = (value: string): value is ThinkResultType => THINK_RESULT_TYPES.includes(value as ThinkResultType);

// String validation
export const isValidString = (value: any, minLength = 1, maxLength = 1000): boolean => {
  return typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;
};

// Category validation
export const isValidCategory = (value: string): boolean => {
  const allowedCategories = ['Animals', 'Food', 'Objects', 'Places', 'Random'];
  return allowedCategories.includes(value);
};

export interface Game {
  id: string;
  user_id: string;
  secret_item: string;
  category: string;
  mode: GameMode;
  questions_asked: number;
  hints_used: number;
  status: GameStatus;
  created_at: string;
}

export interface GameMessage {
  id: string;
  game_id: string;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  question_number: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  sample_items: string[];
}

export interface StartGameRequest {
  category?: string;
  mode?: GameMode;
  user_id?: string;
}

export interface StartGameResponse {
  game_id: string;
  category: string;
  message: string;
}

export interface AskQuestionRequest {
  game_id: string;
  question: string;
}

export interface AskQuestionResponse {
  answer: string;
  questions_remaining: number;
  game_status: GameStatus;
}

export interface GetHintRequest {
  game_id: string;
}

export interface GetHintResponse {
  hint: string;
  hints_remaining: number;
  questions_remaining: number;
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

