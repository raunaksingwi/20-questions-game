import { audioManager, SoundType } from '../AudioManager';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Mock expo-audio
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
}));

// Mock the audio assets
jest.mock('../../assets/sounds/gameStart.ogg', () => 'gameStart.ogg', { virtual: true });
jest.mock('../../assets/sounds/question.wav', () => 'question.wav', { virtual: true });
jest.mock('../../assets/sounds/correct.wav', () => 'correct.wav', { virtual: true });
jest.mock('../../assets/sounds/wrong.wav', () => 'wrong.wav', { virtual: true });

describe('AudioManager', () => {
  let mockAudioPlayer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AudioManager state
    (audioManager as any).initialized = false;
    (audioManager as any).sounds.clear();
    (audioManager as any).isRecordingActive = false;
    
    // Mock audio player
    mockAudioPlayer = {
      volume: 0.5,
      seekTo: jest.fn(),
      play: jest.fn(),
      release: jest.fn(),
    };
    
    (createAudioPlayer as jest.Mock).mockResolvedValue(mockAudioPlayer);
  });

  describe('initialize', () => {
    it('should initialize audio system successfully', async () => {
      await audioManager.initialize();

      expect(createAudioPlayer).toHaveBeenCalledTimes(7); // 7 sound types
      expect((audioManager as any).initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      await audioManager.initialize();
      await audioManager.initialize();

      expect(createAudioPlayer).toHaveBeenCalledTimes(7); // Only called once
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (createAudioPlayer as jest.Mock).mockRejectedValue(new Error('Audio error'));

      await audioManager.initialize();

      // The AudioManager continues and marks as initialized even when individual sounds fail
      expect((audioManager as any).initialized).toBe(true);
      
      // The individual sound loading failures are logged, not the overall initialization
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle individual sound load failures', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Make first sound fail, others succeed
      (createAudioPlayer as jest.Mock)
        .mockRejectedValueOnce(new Error('Sound load error'))
        .mockResolvedValue(mockAudioPlayer);

      await audioManager.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load'),
        expect.any(Error)
      );
      expect((audioManager as any).sounds.size).toBe(6); // 6 out of 7 loaded

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('playSound', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should play sound and haptic feedback', async () => {
      await audioManager.playSound('gameStart');

      expect(mockAudioPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(mockAudioPlayer.play).toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should play different haptic feedback for different sounds', async () => {
      // Test success sound
      await audioManager.playSound('correct');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );

      // Test error sound
      await audioManager.playSound('wrong');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );

      // Test light impact
      await audioManager.playSound('answerYes');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should handle missing sounds gracefully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      (audioManager as any).sounds.clear(); // Remove all sounds

      await audioManager.playSound('gameStart');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('gameStart would play here')
      );
      expect(Haptics.impactAsync).toHaveBeenCalled(); // Haptic still works

      consoleLogSpy.mockRestore();
    });

    it('should handle playback errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAudioPlayer.play.mockImplementation(() => {
        throw new Error('Playback error');
      });

      await audioManager.playSound('gameStart');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to play gameStart feedback:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('recording mode', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should lower volume when recording', async () => {
      await audioManager.setRecordingMode(true);

      expect((audioManager as any).isRecordingActive).toBe(true);
      expect(mockAudioPlayer.volume).toBe(0.1);
    });

    it('should restore volume when not recording', async () => {
      await audioManager.setRecordingMode(true);
      await audioManager.setRecordingMode(false);

      expect((audioManager as any).isRecordingActive).toBe(false);
      expect(mockAudioPlayer.volume).toBe(0.5);
    });

    it('should skip non-critical sounds during recording', async () => {
      await audioManager.setRecordingMode(true);
      
      await audioManager.playSound('question');
      
      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalled(); // Haptic still plays
    });

    it('should play critical sounds even during recording', async () => {
      await audioManager.setRecordingMode(true);
      
      await audioManager.playSound('correct');
      
      expect(mockAudioPlayer.play).toHaveBeenCalled();
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should release all sounds and reset state', async () => {
      await audioManager.initialize();
      
      await audioManager.cleanup();

      expect(mockAudioPlayer.release).toHaveBeenCalled();
      expect((audioManager as any).sounds.size).toBe(0);
      expect((audioManager as any).initialized).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAudioPlayer.release.mockImplementation(() => {
        throw new Error('Release error');
      });

      await audioManager.initialize();
      await audioManager.cleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to cleanup audio:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('auto-initialization', () => {
    it('should initialize automatically when playing sound if not initialized', async () => {
      const initializeSpy = jest.spyOn(audioManager, 'initialize');
      
      await audioManager.playSound('gameStart');

      expect(initializeSpy).toHaveBeenCalled();
      expect(mockAudioPlayer.play).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('Audio System Failures', () => {
      it('should handle audio system unavailable during initialization', async () => {
        (createAudioPlayer as jest.Mock).mockRejectedValue(
          new Error('Audio system not available')
        );
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await audioManager.initialize();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load'),
          expect.any(Error)
        );
        expect((audioManager as any).initialized).toBe(true); // Still marks as initialized

        consoleWarnSpy.mockRestore();
      });

      it('should handle corrupted audio file during load', async () => {
        (createAudioPlayer as jest.Mock).mockRejectedValue(
          new Error('Invalid audio format')
        );
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await audioManager.initialize();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load'),
          expect.objectContaining({ message: 'Invalid audio format' })
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle audio player creation returning null', async () => {
        (createAudioPlayer as jest.Mock).mockResolvedValue(null);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await audioManager.initialize();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load gameStart sound: Player creation returned null')
        );
        expect((audioManager as any).sounds.size).toBe(0);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Memory and Resource Management', () => {
      it('should handle out of memory during sound loading', async () => {
        (createAudioPlayer as jest.Mock).mockRejectedValue(
          new Error('Out of memory')
        );
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await audioManager.initialize();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load'),
          expect.objectContaining({ message: 'Out of memory' })
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle multiple cleanup calls', async () => {
        await audioManager.initialize();
        
        await audioManager.cleanup();
        await audioManager.cleanup(); // Second cleanup should not crash

        expect(mockAudioPlayer.release).toHaveBeenCalledTimes(7); // Once per sound type
        expect((audioManager as any).sounds.size).toBe(0);
      });

      it('should handle release failure during cleanup', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const releaseError = new Error('Release failed');
        mockAudioPlayer.release.mockImplementation(() => {
          throw releaseError;
        });

        await audioManager.initialize();
        await audioManager.cleanup();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to cleanup audio:',
          releaseError
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Device-Specific Issues', () => {
      it('should handle low-end device with limited audio channels', async () => {
        // Simulate limited audio channels by making some players fail
        let createCount = 0;
        (createAudioPlayer as jest.Mock).mockImplementation(() => {
          createCount++;
          if (createCount > 3) {
            return Promise.reject(new Error('Audio channel limit reached'));
          }
          return Promise.resolve(mockAudioPlayer);
        });

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await audioManager.initialize();

        expect((audioManager as any).sounds.size).toBe(3);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load'),
          expect.objectContaining({ message: 'Audio channel limit reached' })
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle device without haptic support', async () => {
        // Mock haptic failure
        (Haptics.impactAsync as jest.Mock).mockRejectedValue(
          new Error('Haptics not supported')
        );

        await audioManager.initialize();
        
        // Should still work but log the haptic error
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        await audioManager.playSound('gameStart');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to play haptic feedback for gameStart:',
          expect.any(Error)
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle device audio focus loss', async () => {
        await audioManager.initialize();
        
        // Simulate audio focus loss during playback
        mockAudioPlayer.play.mockImplementation(() => {
          throw new Error('Audio focus lost');
        });

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        await audioManager.playSound('gameStart');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to play gameStart feedback:',
          expect.objectContaining({ message: 'Audio focus lost' })
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle rapid consecutive sound requests', async () => {
        await audioManager.initialize();

        const promises = Array.from({ length: 100 }, () =>
          audioManager.playSound('question')
        );

        await Promise.all(promises);

        expect(mockAudioPlayer.play).toHaveBeenCalledTimes(100);
        expect(Haptics.impactAsync).toHaveBeenCalledTimes(100);
      });

      it('should handle playing all sound types simultaneously', async () => {
        await audioManager.initialize();

        const soundTypes: SoundType[] = [
          'gameStart', 'question', 'answerYes', 'answerNo', 
          'hint', 'correct', 'wrong'
        ];

        const promises = soundTypes.map(type => 
          audioManager.playSound(type)
        );

        await Promise.all(promises);

        expect(mockAudioPlayer.play).toHaveBeenCalledTimes(7);
      });

      it('should handle invalid sound type gracefully', async () => {
        await audioManager.initialize();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        // @ts-ignore - Intentionally passing invalid sound type for testing
        await audioManager.playSound('invalidSound');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('invalidSound would play here')
        );

        consoleLogSpy.mockRestore();
      });
    });

    describe('Recording Mode Edge Cases', () => {
      it('should handle recording mode toggle during playback', async () => {
        await audioManager.initialize();

        // Start playing a sound
        const playPromise = audioManager.playSound('question');
        
        // Toggle recording mode during playback
        await audioManager.setRecordingMode(true);
        await playPromise;

        expect((audioManager as any).isRecordingActive).toBe(true);
        expect(mockAudioPlayer.volume).toBe(0.1);
      });

      it('should handle multiple rapid recording mode toggles', async () => {
        await audioManager.initialize();

        // Rapid toggles
        await audioManager.setRecordingMode(true);
        await audioManager.setRecordingMode(false);
        await audioManager.setRecordingMode(true);
        await audioManager.setRecordingMode(false);

        expect((audioManager as any).isRecordingActive).toBe(false);
        expect(mockAudioPlayer.volume).toBe(0.5); // Back to normal volume
      });

      it('should handle recording mode with no sounds loaded', async () => {
        // Don't initialize, so no sounds are loaded
        await audioManager.setRecordingMode(true);

        expect((audioManager as any).isRecordingActive).toBe(true);
        // Should not crash even with no sounds
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle simultaneous initialization and playSound', async () => {
        const initPromise = audioManager.initialize();
        const playPromise = audioManager.playSound('gameStart');

        await Promise.all([initPromise, playPromise]);

        expect(mockAudioPlayer.play).toHaveBeenCalled();
      });

      it('should handle simultaneous cleanup and playSound', async () => {
        await audioManager.initialize();
        
        const cleanupPromise = audioManager.cleanup();
        const playPromise = audioManager.playSound('gameStart');

        await Promise.allSettled([cleanupPromise, playPromise]);

        // playSound should handle the fact that sounds were cleaned up
        expect(mockAudioPlayer.release).toHaveBeenCalled();
      });

      it('should handle concurrent recording mode changes', async () => {
        await audioManager.initialize();

        const togglePromises = [
          audioManager.setRecordingMode(true),
          audioManager.setRecordingMode(false),
          audioManager.setRecordingMode(true),
        ];

        await Promise.all(togglePromises);

        // Final state should reflect the last call
        expect((audioManager as any).isRecordingActive).toBe(true);
      });
    });

    describe('Volume Control Edge Cases', () => {
      it('should handle volume changes on null audio players', async () => {
        (createAudioPlayer as jest.Mock).mockResolvedValue(null);
        
        await audioManager.initialize();
        await audioManager.setRecordingMode(true);

        // Should not crash even with null players
        expect((audioManager as any).isRecordingActive).toBe(true);
      });

      it('should handle volume property access errors', async () => {
        // Mock player where volume setter throws
        const problematicPlayer = {
          ...mockAudioPlayer,
          set volume(val: number) {
            throw new Error('Volume control not supported');
          },
          get volume() {
            return 0.5;
          }
        };

        (createAudioPlayer as jest.Mock).mockResolvedValue(problematicPlayer);
        
        await audioManager.initialize();
        
        // Should handle volume errors gracefully
        await audioManager.setRecordingMode(true);
        
        expect((audioManager as any).isRecordingActive).toBe(true);
      });
    });
  });
});