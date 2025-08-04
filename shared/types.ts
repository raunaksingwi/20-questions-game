export type GameStatus = 'active' | 'won' | 'lost';
export type MessageRole = 'system' | 'user' | 'assistant';
export type MessageType = 'question' | 'answer' | 'hint' | 'guess';

export interface Game {
  id: string;
  user_id: string;
  secret_item: string;
  category: string;
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

