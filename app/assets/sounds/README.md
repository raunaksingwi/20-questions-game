# Audio System for 20 Questions Game

## Current Implementation

The game features a **pleasant audio system** using actual sound files for a better user experience:

### Sound Files:
- **Game Start**: `gameStart.ogg` - Cheerful welcome sound
- **Question**: `question.wav` - Gentle notification for user input
- **Answer Yes**: `correct.wav` - Pleasant positive confirmation  
- **Answer No**: `wrong.wav` - Gentle negative response
- **Correct Guess**: `correct.wav` - Same as positive answers (victory celebration)
- **Wrong/Game Over**: `wrong.wav` - Same as negative answers (gentle disappointment)
- **Hint**: `question.wav` - Same as question sound (helpful notification)

### Sound Mapping:
- **gameStart** → `gameStart.ogg`
- **question** → `question.wav`
- **answerYes** → `correct.wav`
- **answerNo** → `wrong.wav`
- **correct** → `correct.wav` (same as answerYes)
- **wrong** → `wrong.wav` (same as answerNo)
- **hint** → `question.wav` (same as question)

### Haptic Feedback:
- **Game Start**: Medium impact vibration
- **Question**: Light impact vibration
- **Answers (Yes/No)**: Light impact vibrations
- **Correct**: Success notification vibration
- **Wrong**: Error notification vibration
- **Hint**: Medium impact vibration

### Technical Features:
- ✅ High-quality audio files instead of generated tones
- ✅ Always-on audio (no toggle needed)
- ✅ Works on all devices
- ✅ Graceful fallbacks if audio fails
- ✅ Pleasant, cheerful sounds
- ✅ Optimized file sizes for mobile

## File Formats Supported:
- **OGG**: Good compression and quality
- **WAV**: Uncompressed, high quality
- **MP3**: Widely supported (can be added if needed)