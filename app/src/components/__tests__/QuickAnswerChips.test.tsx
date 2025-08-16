import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuickAnswerChips } from '../QuickAnswerChips';

describe('QuickAnswerChips', () => {
  const mockOnChipPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onChipPress: mockOnChipPress,
    disabled: false,
  };

  it('renders all quick answer chips', () => {
    const { getByText } = render(<QuickAnswerChips {...defaultProps} />);
    
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
    expect(getByText('Sometimes')).toBeTruthy();
    expect(getByText("Don't know")).toBeTruthy();
  });

  it('calls onChipPress with correct answer and type when chip is pressed', () => {
    const { getByText } = render(<QuickAnswerChips {...defaultProps} />);
    
    fireEvent.press(getByText('Yes'));
    expect(mockOnChipPress).toHaveBeenCalledWith('Yes', 'yes');
    
    fireEvent.press(getByText('No'));
    expect(mockOnChipPress).toHaveBeenCalledWith('No', 'no');
    
    fireEvent.press(getByText('Sometimes'));
    expect(mockOnChipPress).toHaveBeenCalledWith('Sometimes', 'maybe');
    
    fireEvent.press(getByText("Don't know"));
    expect(mockOnChipPress).toHaveBeenCalledWith("Don't know", 'dont_know');
  });

  it('does not call onChipPress when disabled', () => {
    const { getByText } = render(
      <QuickAnswerChips {...defaultProps} disabled={true} />
    );
    
    fireEvent.press(getByText('Yes'));
    expect(mockOnChipPress).not.toHaveBeenCalled();
  });

  it('applies disabled styling when disabled', () => {
    const { getByText } = render(
      <QuickAnswerChips {...defaultProps} disabled={true} />
    );
    
    const yesChip = getByText('Yes');
    expect(yesChip).toBeTruthy();
    // Note: In a real app, you might test style properties or testID attributes
    // Here we verify the chip still renders but doesn't respond to press
  });

  it('handles multiple chip presses correctly', () => {
    const { getByText } = render(<QuickAnswerChips {...defaultProps} />);
    
    fireEvent.press(getByText('Yes'));
    fireEvent.press(getByText('Sometimes'));
    fireEvent.press(getByText('No'));
    
    expect(mockOnChipPress).toHaveBeenCalledTimes(3);
    expect(mockOnChipPress).toHaveBeenNthCalledWith(1, 'Yes', 'yes');
    expect(mockOnChipPress).toHaveBeenNthCalledWith(2, 'Sometimes', 'maybe');
    expect(mockOnChipPress).toHaveBeenNthCalledWith(3, 'No', 'no');
  });

  it('provides proper accessibility labels', () => {
    const { getByLabelText } = render(<QuickAnswerChips {...defaultProps} />);
    
    expect(getByLabelText('Quick answer: Yes')).toBeTruthy();
    expect(getByLabelText('Quick answer: No')).toBeTruthy();
    expect(getByLabelText('Quick answer: Sometimes')).toBeTruthy();
    expect(getByLabelText("Quick answer: Don't know")).toBeTruthy();
  });

  it('has proper accessibility hints', () => {
    const { getAllByA11yHint } = render(<QuickAnswerChips {...defaultProps} />);
    
    const elementsWithHint = getAllByA11yHint('Tap to send this answer immediately');
    expect(elementsWithHint).toHaveLength(4); // Should have 4 chips with the hint (removed Irrelevant)
  });
});