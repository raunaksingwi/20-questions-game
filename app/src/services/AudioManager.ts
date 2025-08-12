import * as Haptics from 'expo-haptics';

export type SoundType = 'gameStart' | 'question' | 'answerYes' | 'answerNo' | 'correct' | 'wrong' | 'hint';

class AudioManager {
  private initialized: boolean = false;
  private isRecordingActive: boolean = false;
  private recordingStartTime: number = 0;
  private forceCleanupInProgress: boolean = false;

  async initialize() {
    // Only haptic feedback - no audio loading required
    this.initialized = true;
  }

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

  async forceResetRecordingMode() {
    this.forceCleanupInProgress = true;
    
    try {
      this.isRecordingActive = false;
      this.recordingStartTime = 0;
    } finally {
      this.forceCleanupInProgress = false;
    }
  }

  getRecordingStatus() {
    return {
      isRecordingActive: this.isRecordingActive,
      recordingDuration: this.recordingStartTime > 0 ? Date.now() - this.recordingStartTime : 0,
      initialized: this.initialized,
    };
  }

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