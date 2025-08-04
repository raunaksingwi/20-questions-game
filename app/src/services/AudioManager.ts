import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export type SoundType = 'gameStart' | 'question' | 'answerYes' | 'answerNo' | 'correct' | 'wrong' | 'hint';

class AudioManager {
  private sounds: Map<SoundType, Audio.Sound> = new Map();
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true, // Play sounds even in silent mode
        shouldDuckAndroid: true,    // Lower other app volumes
        playThroughEarpieceAndroid: false,
      });

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
      // Load actual sound files from assets
      const soundFiles = {
        gameStart: require('../../assets/sounds/gameStart.ogg'),
        question: require('../../assets/sounds/question.wav'),
        answerYes: require('../../assets/sounds/correct.wav'),     // Use correct sound for positive answers
        answerNo: require('../../assets/sounds/wrong.wav'),       // Use wrong sound for negative answers
        correct: require('../../assets/sounds/correct.wav'),      // Same as answerYes
        wrong: require('../../assets/sounds/wrong.wav'),          // Same as answerNo
        hint: require('../../assets/sounds/question.wav'),        // Same as question
      };

      for (const [soundType, soundFile] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            soundFile,
            {
              shouldPlay: false,
              volume: 0.3, // Reasonable volume for downloaded sounds
              isLooping: false,
            }
          );
          this.sounds.set(soundType as SoundType, sound);
        } catch (error) {
          console.warn(`Failed to load ${soundType} sound:`, error);
        }
      }
      
      console.log('Audio system ready with downloaded sound files');
    } catch (error) {
      console.warn('Failed to load audio files:', error);
    }
  }

  async playSound(soundType: SoundType) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Play haptic feedback first (always works)
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

      // Try to play the generated tone
      const sound = this.sounds.get(soundType);
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (error) {
      console.warn(`Failed to play ${soundType} feedback:`, error);
      // Fail silently - don't interrupt game experience
    }
  }


  async cleanup() {
    try {
      // Unload all sounds to free memory
      for (const sound of this.sounds.values()) {
        await sound.unloadAsync();
      }
      this.sounds.clear();
      this.initialized = false;
    } catch (error) {
      console.warn('Failed to cleanup audio:', error);
    }
  }
}

export const audioManager = new AudioManager();