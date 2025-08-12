import { audioManager, SoundType } from '../AudioManager';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
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
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('AudioManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AudioManager state
    (audioManager as any).initialized = false;
    (audioManager as any).isRecordingActive = false;
    (audioManager as any).forceCleanupInProgress = false;
    (audioManager as any).recordingStartTime = 0;
  });

  describe('initialize', () => {
    it('should initialize successfully without audio loading', async () => {
      await audioManager.initialize();

      expect((audioManager as any).initialized).toBe(true);
    });

    it('should not fail on multiple initializations', async () => {
      await audioManager.initialize();
      await audioManager.initialize();

      expect((audioManager as any).initialized).toBe(true);
    });
  });

  describe('playSound', () => {
    it('should play haptic feedback for gameStart', async () => {
      await audioManager.playSound('gameStart');

      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });

    it('should play haptic feedback for question', async () => {
      await audioManager.playSound('question');

      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('should play haptic feedback for correct', async () => {
      await audioManager.playSound('correct');

      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('should play haptic feedback for wrong', async () => {
      await audioManager.playSound('wrong');

      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    });

    it('should play haptic feedback for hint', async () => {
      await audioManager.playSound('hint');

      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });

    it('should handle haptic feedback errors gracefully', async () => {
      (Haptics.impactAsync as jest.Mock).mockRejectedValue(new Error('Haptics failed'));

      await expect(audioManager.playSound('gameStart')).resolves.not.toThrow();
    });

    it('should initialize automatically if not initialized', async () => {
      expect((audioManager as any).initialized).toBe(false);

      await audioManager.playSound('correct');

      expect((audioManager as any).initialized).toBe(true);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });
  });

  describe('recording mode', () => {
    it('should set recording mode to active', async () => {
      await audioManager.setRecordingMode(true);

      expect((audioManager as any).isRecordingActive).toBe(true);
      expect((audioManager as any).recordingStartTime).toBeGreaterThan(0);
    });

    it('should set recording mode to inactive', async () => {
      await audioManager.setRecordingMode(true);
      await audioManager.setRecordingMode(false);

      expect((audioManager as any).isRecordingActive).toBe(false);
      expect((audioManager as any).recordingStartTime).toBe(0);
    });

    it('should skip mode change during cleanup', async () => {
      (audioManager as any).forceCleanupInProgress = true;

      await audioManager.setRecordingMode(false);

      // Should not change state when cleanup is in progress
    });
  });

  describe('forceResetRecordingMode', () => {
    it('should reset recording state', async () => {
      await audioManager.setRecordingMode(true);
      
      await audioManager.forceResetRecordingMode();

      expect((audioManager as any).isRecordingActive).toBe(false);
      expect((audioManager as any).recordingStartTime).toBe(0);
      expect((audioManager as any).forceCleanupInProgress).toBe(false);
    });
  });

  describe('getRecordingStatus', () => {
    it('should return correct recording status', async () => {
      await audioManager.initialize();
      await audioManager.setRecordingMode(true);

      const status = audioManager.getRecordingStatus();

      expect(status.isRecordingActive).toBe(true);
      expect(status.initialized).toBe(true);
      expect(status.recordingDuration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate recording duration correctly', async () => {
      await audioManager.setRecordingMode(true);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = audioManager.getRecordingStatus();

      expect(status.recordingDuration).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should reset state during cleanup', async () => {
      await audioManager.initialize();
      
      await audioManager.cleanup();

      expect((audioManager as any).initialized).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle all sound types correctly', async () => {
      const soundTypes: SoundType[] = ['gameStart', 'question', 'answerYes', 'answerNo', 'correct', 'wrong', 'hint'];

      for (const soundType of soundTypes) {
        await audioManager.playSound(soundType);
      }

      expect(Haptics.impactAsync).toHaveBeenCalled();
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });

    it('should handle rapid consecutive calls', async () => {
      const promises = Array(5).fill(null).map(() => audioManager.playSound('correct'));
      
      await Promise.all(promises);

      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(5);
    });

    it('should handle recording mode toggles', async () => {
      await audioManager.setRecordingMode(true);
      await audioManager.setRecordingMode(false);
      await audioManager.setRecordingMode(true);

      expect((audioManager as any).isRecordingActive).toBe(true);
    });
  });
});