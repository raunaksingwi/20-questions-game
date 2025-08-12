import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export type SoundType = 'gameStart' | 'question' | 'answerYes' | 'answerNo' | 'correct' | 'wrong' | 'hint';

class AudioManager {
  private sounds: Map<SoundType, any> = new Map();
  private initialized: boolean = false;
  private isRecordingActive: boolean = false;
  private originalVolume: number = 0.5;
  private recordingStartTime: number = 0;
  private forceCleanupInProgress: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Preload sounds
      await this.preloadSounds();
      
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
      // Continue without audio if initialization fails
      this.initialized = true;
    }
  }

  private async preloadSounds() {
    try {
      console.log('Loading audio files...');
      
      // Load sound assets with correct path
      const soundAssets = {
        gameStart: require('../assets/sounds/gameStart.ogg'),
        question: require('../assets/sounds/question.wav'),
        answerYes: require('../assets/sounds/correct.wav'),
        answerNo: require('../assets/sounds/wrong.wav'),
        correct: require('../assets/sounds/correct.wav'),
        wrong: require('../assets/sounds/wrong.wav'),
        hint: require('../assets/sounds/question.wav'),
      };

      // Create audio players for each sound
      for (const [soundType, asset] of Object.entries(soundAssets)) {
        try {
          const player = await createAudioPlayer(asset);
          if (player) {
            player.volume = this.originalVolume;
            this.sounds.set(soundType as SoundType, player);
            console.log(`✅ Loaded ${soundType} sound`);
          } else {
            console.warn(`Failed to load ${soundType} sound: Player creation returned null`);
          }
        } catch (error) {
          console.warn(`Failed to load ${soundType} sound:`, error);
        }
      }
      
      console.log(`🔊 Audio system ready with ${this.sounds.size} sounds loaded`);
    } catch (error) {
      console.warn('Failed to load audio files:', error);
      // Continue without audio
    }
  }

  async setRecordingMode(isRecording: boolean) {
    console.log(`🔊 AudioManager: Setting recording mode to ${isRecording}`);
    console.log(`🔊 AudioManager: Current state - recording: ${this.isRecordingActive}, cleanup: ${this.forceCleanupInProgress}`);
    
    // Prevent recursive calls during cleanup
    if (this.forceCleanupInProgress && !isRecording) {
      console.log(`🔊 AudioManager: Skipping recording mode change during cleanup`);
      return;
    }
    
    this.isRecordingActive = isRecording;
    
    if (isRecording) {
      this.recordingStartTime = Date.now();
      // Lower volume when recording to avoid interference
      await this.setVolume(0.1);
      console.log(`🔊 AudioManager: Recording mode enabled, volume lowered`);
    } else {
      const duration = this.recordingStartTime > 0 ? Date.now() - this.recordingStartTime : 0;
      console.log(`🔊 AudioManager: Recording mode disabled after ${duration}ms`);
      
      // Restore normal volume when not recording
      await this.setVolume(this.originalVolume);
      this.recordingStartTime = 0;
    }
  }

  async forceResetRecordingMode() {
    console.log(`🔊 AudioManager: Force resetting recording mode`);
    this.forceCleanupInProgress = true;
    
    try {
      this.isRecordingActive = false;
      this.recordingStartTime = 0;
      await this.setVolume(this.originalVolume);
      console.log(`🔊 AudioManager: Force reset completed`);
    } catch (error) {
      console.warn(`🔊 AudioManager: Error during force reset:`, error);
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

  private async setVolume(volume: number) {
    try {
      for (const sound of this.sounds.values()) {
        sound.volume = volume;
      }
    } catch (error) {
      console.warn('Failed to adjust volume:', error);
    }
  }

  async playSound(soundType: SoundType) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Skip audio playback during recording (except for critical sounds)
    const criticalSounds: SoundType[] = ['correct', 'wrong'];
    if (this.isRecordingActive && !criticalSounds.includes(soundType)) {
      // Still provide haptic feedback even when skipping audio
      await this.playHapticFeedback(soundType);
      return;
    }

    try {
      // Play haptic feedback first (always works)
      await this.playHapticFeedback(soundType);

      // Try to play the audio file
      const sound = this.sounds.get(soundType);
      if (sound) {
        sound.seekTo(0); // Reset to beginning
        sound.play();
      } else {
        console.log(`Sound ${soundType} would play here (audio temporarily disabled)`);
      }
    } catch (error) {
      console.warn(`Failed to play ${soundType} feedback:`, error);
      // Fail silently - don't interrupt game experience
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
    try {
      // Release all sounds to free memory
      for (const sound of this.sounds.values()) {
        sound.release();
      }
      this.sounds.clear();
      this.initialized = false;
    } catch (error) {
      console.warn('Failed to cleanup audio:', error);
    }
  }
}

export const audioManager = new AudioManager();