import { INPUT_DIMENSIONS, CALCULATED_DIMENSIONS } from '../inputDimensions';

describe('inputDimensions', () => {
  it('should have consistent voice button sizing', () => {
    expect(INPUT_DIMENSIONS.VOICE_BUTTON_SIZE).toBe(44);
    expect(INPUT_DIMENSIONS.VOICE_BUTTON_BORDER_RADIUS).toBe(22);
    expect(INPUT_DIMENSIONS.VOICE_BUTTON_BORDER_RADIUS * 2).toBe(INPUT_DIMENSIONS.VOICE_BUTTON_SIZE);
  });

  it('should have consistent text input sizing', () => {
    expect(INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT).toBe(48);
    expect(INPUT_DIMENSIONS.TEXT_INPUT_BORDER_RADIUS).toBe(24);
    expect(INPUT_DIMENSIONS.TEXT_INPUT_BORDER_RADIUS * 2).toBe(INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT);
  });

  it('should calculate correct positioning offsets', () => {
    // Voice button should be centered vertically in text input
    const expectedTopOffset = (INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT - INPUT_DIMENSIONS.VOICE_BUTTON_SIZE) / 2;
    expect(CALCULATED_DIMENSIONS.VOICE_BUTTON_TOP_OFFSET).toBe(expectedTopOffset);
    expect(CALCULATED_DIMENSIONS.VOICE_BUTTON_TOP_OFFSET).toBe(2); // (48 - 44) / 2 = 2

    // Voice button right offset should match margin
    expect(CALCULATED_DIMENSIONS.VOICE_BUTTON_RIGHT_OFFSET).toBe(INPUT_DIMENSIONS.VOICE_BUTTON_MARGIN);
    expect(CALCULATED_DIMENSIONS.VOICE_BUTTON_RIGHT_OFFSET).toBe(2);
  });

  it('should calculate correct text input right padding', () => {
    const expectedPadding = INPUT_DIMENSIONS.VOICE_BUTTON_SIZE + INPUT_DIMENSIONS.VOICE_BUTTON_MARGIN * 2;
    expect(CALCULATED_DIMENSIONS.TEXT_INPUT_RIGHT_PADDING).toBe(expectedPadding);
    expect(CALCULATED_DIMENSIONS.TEXT_INPUT_RIGHT_PADDING).toBe(48); // 44 + (2 * 2) = 48
  });
});