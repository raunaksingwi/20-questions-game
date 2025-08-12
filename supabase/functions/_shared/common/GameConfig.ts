export interface GameConfig {
  maxQuestions: number
  maxHints: number
  requestDeduplicationWindow: number
}

export interface GameLimits {
  questionsPerGame: number
  hintsPerGame: number
  statementTimeout: string
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxQuestions: 20,
  maxHints: 3,
  requestDeduplicationWindow: 2000
}

export const DEFAULT_GAME_LIMITS: GameLimits = {
  questionsPerGame: 20,
  hintsPerGame: 3,
  statementTimeout: '5s'
}