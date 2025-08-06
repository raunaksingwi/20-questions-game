import React from 'react';
import { render } from '@testing-library/react-native';
import { GameHeader } from '../GameHeader';

describe('GameHeader', () => {
  const defaultProps = {
    category: 'Animals',
    questionsRemaining: 15,
    hintsRemaining: 2,
  };

  it('renders correctly', () => {
    const { getByText } = render(<GameHeader {...defaultProps} />);
    
    expect(getByText('Category: Animals')).toBeTruthy();
    expect(getByText('Questions: 15/20')).toBeTruthy();
    expect(getByText('Hints: 2/3')).toBeTruthy();
  });

  it('renders with different category', () => {
    const { getByText } = render(
      <GameHeader {...defaultProps} category="Food" />
    );
    
    expect(getByText('Category: Food')).toBeTruthy();
  });

  it('renders with different questions remaining', () => {
    const { getByText } = render(
      <GameHeader {...defaultProps} questionsRemaining={5} />
    );
    
    expect(getByText('Questions: 5/20')).toBeTruthy();
  });

  it('renders with no hints remaining', () => {
    const { getByText } = render(
      <GameHeader {...defaultProps} hintsRemaining={0} />
    );
    
    expect(getByText('Hints: 0/3')).toBeTruthy();
  });

  it('renders with no questions remaining', () => {
    const { getByText } = render(
      <GameHeader {...defaultProps} questionsRemaining={0} />
    );
    
    expect(getByText('Questions: 0/20')).toBeTruthy();
  });
});