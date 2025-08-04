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
    // Create pleasant, musical sounds using chord progressions and soft tones
    
    try {
      // Define pleasant, quiet musical sounds for each event
      const soundConfigs = {
        gameStart: { type: 'chord', notes: [523, 659, 784], duration: 0.6, volume: 0.15 },    // Softer C major chord
        question: { type: 'soft-click', frequency: 1047, duration: 0.12, volume: 0.08 },      // Higher, gentler C note
        answerYes: { type: 'pleasant', frequency: 784, duration: 0.2, volume: 0.12 },         // Bright G note
        answerNo: { type: 'gentle', frequency: 659, duration: 0.2, volume: 0.12 },            // Warm E note (still positive)
        correct: { type: 'victory', notes: [523, 659, 784, 1047], duration: 0.5, volume: 0.2 }, // Cheerful ascending
        wrong: { type: 'gentle-sad', frequency: 523, duration: 0.4, volume: 0.15 },           // Still C but softer (not sad)
        hint: { type: 'magical', notes: [659, 784, 988], duration: 0.35, volume: 0.15 }       // Softer magical chimes
      };

      for (const [soundType, config] of Object.entries(soundConfigs)) {
        try {
          let sound;
          if (config.type === 'chord' || config.type === 'victory' || config.type === 'magical') {
            sound = await this.createChordSound(config.notes, config.duration, config.volume);
          } else {
            sound = await this.createSoftToneSound(config.frequency, config.duration, config.volume);
          }
          this.sounds.set(soundType as SoundType, sound);
        } catch (error) {
          console.warn(`Failed to create ${soundType} sound:`, error);
        }
      }
      
      console.log('Audio system ready with pleasant musical tones');
    } catch (error) {
      console.warn('Failed to initialize audio tones:', error);
    }
  }

  private async createSoftToneSound(frequency: number, duration: number, volume: number): Promise<Audio.Sound> {
    // Create a soft, pleasant tone with fade in/out
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(samples * 2);
    const view = new DataView(buffer);
    
    const fadeInSamples = Math.floor(samples * 0.1); // 10% fade in
    const fadeOutSamples = Math.floor(samples * 0.2); // 20% fade out
    
    for (let i = 0; i < samples; i++) {
      // Create a cheerful sine wave with bright harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * i / sampleRate) * 0.15; // Softer second harmonic
      const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * i / sampleRate) * 0.08; // Even softer third
      const brightHarmonic = Math.sin(2 * Math.PI * frequency * 1.5 * i / sampleRate) * 0.05; // Add brightness
      
      let sample = fundamental + harmonic2 + harmonic3 + brightHarmonic;
      
      // Apply fade in/out envelope for smoothness
      let envelope = 1;
      if (i < fadeInSamples) {
        envelope = i / fadeInSamples;
      } else if (i > samples - fadeOutSamples) {
        envelope = (samples - i) / fadeOutSamples;
      }
      
      sample *= envelope * volume;
      const value = Math.max(-1, Math.min(1, sample)) * 32767;
      view.setInt16(i * 2, value, true);
    }
    
    return this.createSoundFromBuffer(buffer, samples, sampleRate);
  }

  private async createChordSound(frequencies: number[], duration: number, volume: number): Promise<Audio.Sound> {
    // Create a pleasant chord by combining multiple frequencies
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(samples * 2);
    const view = new DataView(buffer);
    
    const fadeInSamples = Math.floor(samples * 0.1);
    const fadeOutSamples = Math.floor(samples * 0.3);
    
    for (let i = 0; i < samples; i++) {
      let sample = 0;
      
      // Combine all frequencies in the chord with cheerful harmonics
      frequencies.forEach((freq, index) => {
        const weight = 1 / Math.sqrt(frequencies.length); // Balance volume
        const fundamental = Math.sin(2 * Math.PI * freq * i / sampleRate) * weight;
        const brightHarmonic = Math.sin(2 * Math.PI * freq * 1.2 * i / sampleRate) * weight * 0.1; // Add sparkle
        sample += fundamental + brightHarmonic;
      });
      
      // Apply smooth envelope
      let envelope = 1;
      if (i < fadeInSamples) {
        envelope = Math.sin((Math.PI / 2) * (i / fadeInSamples)); // Smooth sine fade in
      } else if (i > samples - fadeOutSamples) {
        envelope = Math.sin((Math.PI / 2) * ((samples - i) / fadeOutSamples));
      }
      
      sample *= envelope * volume;
      const value = Math.max(-1, Math.min(1, sample)) * 32767;
      view.setInt16(i * 2, value, true);
    }
    
    return this.createSoundFromBuffer(buffer, samples, sampleRate);
  }

  private async createSoundFromBuffer(buffer: ArrayBuffer, samples: number, sampleRate: number): Promise<Audio.Sound> {
    // Convert buffer to base64 and create sound
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    
    // Create WAV header and combine with data
    const wavHeader = this.createWavHeader(samples, sampleRate);
    const wavData = `data:audio/wav;base64,${btoa(wavHeader + binary)}`;
    
    const { sound } = await Audio.Sound.createAsync(
      { uri: wavData },
      { shouldPlay: false, volume: 1.0 } // Volume controlled in generation
    );
    
    return sound;
  }

  private createWavHeader(samples: number, sampleRate: number): string {
    const byteRate = sampleRate * 2;
    const dataSize = samples * 2;
    const fileSize = dataSize + 36;
    
    let header = '';
    header += 'RIFF';
    header += String.fromCharCode(fileSize & 0xff, (fileSize >> 8) & 0xff, (fileSize >> 16) & 0xff, (fileSize >> 24) & 0xff);
    header += 'WAVE';
    header += 'fmt ';
    header += String.fromCharCode(16, 0, 0, 0); // Format chunk size
    header += String.fromCharCode(1, 0); // Audio format (PCM)
    header += String.fromCharCode(1, 0); // Number of channels
    header += String.fromCharCode(sampleRate & 0xff, (sampleRate >> 8) & 0xff, (sampleRate >> 16) & 0xff, (sampleRate >> 24) & 0xff);
    header += String.fromCharCode(byteRate & 0xff, (byteRate >> 8) & 0xff, (byteRate >> 16) & 0xff, (byteRate >> 24) & 0xff);
    header += String.fromCharCode(2, 0); // Block align
    header += String.fromCharCode(16, 0); // Bits per sample
    header += 'data';
    header += String.fromCharCode(dataSize & 0xff, (dataSize >> 8) & 0xff, (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff);
    
    return header;
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