import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingGame } from '../LoadingGame';

describe('LoadingGame', () => {
  it('renders correctly', () => {
    const { getByText, UNSAFE_getByType } = render(<LoadingGame />);
    const { ActivityIndicator } = require('react-native');
    
    expect(getByText('Starting new game...')).toBeTruthy();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays the loading text', () => {
    const { getByText } = render(<LoadingGame />);
    
    expect(getByText('Starting new game...')).toBeTruthy();
  });

  it('shows activity indicator', () => {
    const { UNSAFE_getByType } = render(<LoadingGame />);
    const { ActivityIndicator } = require('react-native');
    
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});