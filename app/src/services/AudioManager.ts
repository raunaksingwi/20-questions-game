/**
 * Audio manager service that handles haptic feedback for game events.
 * Manages recording state and provides sound effects through device haptics.
 */
import * as Haptics from 'expo-haptics';

/**
 * Types of sounds/haptic feedback available in the game.
 */
export type SoundType = 'gameStart' | 'question' | 'answerYes' | 'answerNo' | 'correct' | 'wrong' | 'hint';

class AudioManager {
  private initialized: boolean = false;
  private isRecordingActive: boolean = false;
  private recordingStartTime: number = 0;
  private forceCleanupInProgress: boolean = false;

  /**
   * Initializes the audio manager for haptic feedback.
   */
  async initialize() {
    // Only haptic feedback - no audio loading required
    this.initialized = true;
  }

  /**
   * Sets the recording mode state and tracks recording timing.
   */
  async setRecordingMode(isRecording: boolean) {
    // Prevent recursive calls during cleanup
    if (this.forceCleanupInProgress && !isRecording) {
      return;
    }
    
    this.isRecordingActive = isRecording;
    
    if (isRecording) {
      this.recordingStartTime = Date.now();
    } else {
      this.recordingStartTime = 0;
    }
  }

  /**
   * Forces a reset of recording mode state, used for cleanup scenarios.
   */
  async forceResetRecordingMode() {
    this.forceCleanupInProgress = true;
    
    try {
      this.isRecordingActive = false;
      this.recordingStartTime = 0;
    } finally {
      this.forceCleanupInProgress = false;
    }
  }

  /**
   * Returns current recording status including duration and state.
   */
  getRecordingStatus() {
    return {
      isRecordingActive: this.isRecordingActive,
      recordingDuration: this.recordingStartTime > 0 ? Date.now() - this.recordingStartTime : 0,
      initialized: this.initialized,
    };
  }

  /**
   * Plays haptic feedback for the specified sound type.
   */
  async playSound(soundType: SoundType) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Only play haptic feedback - no audio
      await this.playHapticFeedback(soundType);
    } catch (error) {
      console.warn(`Failed to play ${soundType} haptic feedback:`, error);
    }
  }

  /**
   * Private method that maps sound types to specific haptic feedback patterns.
   */
  private async playHapticFeedback(soundType: SoundType) {
    try {
      switch (soundType) {
        case 'gameStart':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'question':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'answerYes':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'answerNo':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'correct':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'wrong':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'hint':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
      }
    } catch (error) {
      console.warn(`Failed to play haptic feedback for ${soundType}:`, error);
    }
  }


  async cleanup() {
    // No audio resources to clean up - only reset state
    this.initialized = false;
  }
}

export const audioManager = new AudioManager();