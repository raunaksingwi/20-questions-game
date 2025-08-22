import { DEFAULT_GAME_CONFIG, GameConfig } from '../GameConfig';

describe('GameConfig', () => {
  it('should have correct max questions', () => {
    expect(DEFAULT_GAME_CONFIG.maxQuestions).toBe(20);
  });

  it('should have all required config properties', () => {
    expect(DEFAULT_GAME_CONFIG).toHaveProperty('maxQuestions');
    expect(DEFAULT_GAME_CONFIG).toHaveProperty('maxHints');
    expect(DEFAULT_GAME_CONFIG).toHaveProperty('requestDeduplicationWindow');
    expect(typeof DEFAULT_GAME_CONFIG.maxQuestions).toBe('number');
    expect(DEFAULT_GAME_CONFIG.maxQuestions).toBeGreaterThan(0);
  });

  it('should use reasonable game limit', () => {
    expect(DEFAULT_GAME_CONFIG.maxQuestions).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_GAME_CONFIG.maxQuestions).toBeLessThanOrEqual(50);
  });

  it('should have correct hint count', () => {
    expect(DEFAULT_GAME_CONFIG.maxHints).toBe(3);
    expect(DEFAULT_GAME_CONFIG.maxHints).toBeGreaterThan(0);
  });

  it('should have valid deduplication window', () => {
    expect(DEFAULT_GAME_CONFIG.requestDeduplicationWindow).toBe(2000);
    expect(DEFAULT_GAME_CONFIG.requestDeduplicationWindow).toBeGreaterThan(0);
  });

  it('should match GameConfig interface', () => {
    const config: GameConfig = DEFAULT_GAME_CONFIG;
    expect(config).toBeDefined();
  });
});