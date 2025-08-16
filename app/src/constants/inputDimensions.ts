/**
 * Shared constants for input components to ensure consistent sizing and positioning.
 * Used by GameInput and voice components for layout calculations.
 */
export const INPUT_DIMENSIONS = {
  // Text input dimensions
  TEXT_INPUT_HEIGHT: 48,
  TEXT_INPUT_BORDER_RADIUS: 24,
  TEXT_INPUT_HORIZONTAL_PADDING: 20,
  TEXT_INPUT_VERTICAL_PADDING: 12,
  
  // Voice button dimensions - now larger for better touch targets
  VOICE_BUTTON_SIZE: 44,
  VOICE_BUTTON_BORDER_RADIUS: 22,
  
  // Positioning constants
  VOICE_BUTTON_MARGIN: 2, // Space between input border and button
  VOICE_BUTTON_RIGHT_PADDING: 48, // TEXT_INPUT_HORIZONTAL_PADDING + VOICE_BUTTON_SIZE + margin adjustments
} as const;

/**
 * Calculated values based on base dimensions.
 * Provides computed positioning and sizing values.
 */
export const CALCULATED_DIMENSIONS = {
  /**
   * Right padding for text input to make space for voice button.
   */
  get TEXT_INPUT_RIGHT_PADDING(): number {
    return INPUT_DIMENSIONS.VOICE_BUTTON_SIZE + INPUT_DIMENSIONS.VOICE_BUTTON_MARGIN * 2;
  },
  
  /**
   * Top offset for voice button to center it vertically in the text input.
   */
  get VOICE_BUTTON_TOP_OFFSET(): number {
    return (INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT - INPUT_DIMENSIONS.VOICE_BUTTON_SIZE) / 2;
  },
  
  /**
   * Right offset for voice button positioning within the text input.
   */
  get VOICE_BUTTON_RIGHT_OFFSET(): number {
    return INPUT_DIMENSIONS.VOICE_BUTTON_MARGIN;
  },
} as const;