export type GameStatus = 'active' | 'won' | 'lost';
export type GameMode = 'guess' | 'think';
export type MessageRole = 'system' | 'user' | 'assistant';
export type MessageType = 'question' | 'answer' | 'hint' | 'guess';

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
  answer_type: 'chip' | 'text' | 'voice';
}

export interface SubmitUserAnswerResponse {
  next_question?: string;
  questions_asked: number;
  questions_remaining: number;
  game_status: GameStatus;
}

export interface FinalizeThinkResultRequest {
  session_id: string;
  result: 'llm_win' | 'llm_loss';
}

export interface FinalizeThinkResultResponse {
  message: string;
  questions_used: number;
  secret_item?: string;
}

