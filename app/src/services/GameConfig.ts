export interface GameConfig {
  maxQuestions: number
  maxHints: number
  requestDeduplicationWindow: number
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxQuestions: 20,
  maxHints: 3,
  requestDeduplicationWindow: 2000
}