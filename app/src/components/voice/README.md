# Professional Voice Input Components

This directory contains the redesigned professional voice input system inspired by industry-leading apps like WhatsApp, iOS Voice Memos, Google Assistant, and Discord.

## Components

### `ProfessionalVoiceButton`
The main voice input button with sophisticated animations and interactions.

**Features:**
- **Multi-layer animations**: Glow, pulse, ripple effects for premium feel
- **Professional spring animations**: Smooth, responsive feedback like iOS
- **Smart color transitions**: Context-aware colors for different states
- **Advanced gesture handling**: Long press to record, tap to send/clear errors
- **Accessible design**: Clear visual states and feedback

**States:**
- `idle` with mic icon (indigo background)
- `recording` with live waveform (red background)  
- `send` with send icon when text exists (blue background)
- `error` with alert icon (amber background)
- `disabled` with reduced opacity (gray background)

### `ModernWaveformVisualizer`
A sophisticated waveform visualizer that responds to voice input.

**Features:**
- **Organic wave patterns**: Natural-looking audio visualization
- **Volume-responsive**: Bars react to actual microphone input
- **Center-weighted distribution**: Middle bars are more responsive
- **Smooth Reanimated animations**: 60fps performance
- **Staggered timing**: Each bar animates with slight delays for fluid motion

### `useAdvancedButtonAnimations`
Professional animation hook with multiple layers of visual feedback.

**Animation Layers:**
1. **Core button**: Scale, elevation, shadow animations
2. **Ripple effect**: Touch feedback with expanding circle
3. **Pulse effect**: Breathing animation during recording  
4. **Glow effect**: Ambient lighting for premium feel

**Animation Principles:**
- **Spring-based**: Natural, physics-based motion
- **Micro-interactions**: Subtle feedback for every interaction
- **Layered effects**: Multiple simultaneous animations for depth
- **Performance optimized**: Uses native driver where possible

## Design Inspiration

### WhatsApp Voice Messages
- **Circular recording button**: Clean, minimal design
- **Smooth expansion**: Button grows during recording
- **Clear visual hierarchy**: Recording state is immediately obvious

### iOS Voice Memos  
- **Elegant waveform**: Sophisticated audio visualization
- **Breathing animation**: Subtle pulse during recording
- **Premium feel**: High-quality animations and transitions

### Google Assistant
- **Dynamic colors**: Context-aware color transitions
- **Responsive feedback**: Immediate visual response to input
- **Modern aesthetics**: Clean, contemporary design language

### Discord Voice Activity
- **Live audio visualization**: Real-time response to voice
- **Professional indicators**: Clear communication of state
- **Gaming-focused design**: Engaging and dynamic

## Technical Implementation

### Animation Architecture
```typescript
// Multi-layer animation system
const animations = useAdvancedButtonAnimations();

// Professional spring configuration
const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 1,
};

// Smooth timing for color transitions
const timingConfig = {
  duration: 250,
};
```

### Performance Considerations
- **Native driver**: Used wherever possible for 60fps animations
- **Worklet optimized**: Gesture handling runs on UI thread
- **Efficient re-renders**: Animated values prevent unnecessary React re-renders
- **Memory conscious**: Proper cleanup of animation references

### Accessibility
- **Clear visual states**: Each state has distinct visual appearance
- **Haptic feedback**: Tactile confirmation of interactions
- **Color contrast**: Professional color palette with good contrast ratios
- **Screen reader friendly**: Proper component structure for accessibility

## Usage Example

```typescript
import { ProfessionalVoiceButton } from './voice/ProfessionalVoiceButton';

<ProfessionalVoiceButton
  onTextSubmit={handleTextSubmit}
  onVoiceSubmit={handleVoiceSubmit}
  inputText={question}
  setInputText={setQuestion}
  disabled={sending || gameStatus !== 'active'}
/>
```

## Migration from Legacy Components

The new `ProfessionalVoiceButton` is a drop-in replacement for the old `VoiceInputButton`:

**Before:**
```typescript
import VoiceInputButton from './VoiceInputButton';
```

**After:**
```typescript
import { ProfessionalVoiceButton } from './voice/ProfessionalVoiceButton';
```

All props remain the same, but the visual experience is dramatically improved with professional-grade animations and interactions.