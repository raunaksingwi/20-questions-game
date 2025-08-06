import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingScreen from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('should render with default loading message', () => {
    const { getByText, UNSAFE_getByType } = render(<LoadingScreen />);

    expect(getByText('Loading...')).toBeTruthy();
    expect(() => UNSAFE_getByType(require('react-native').ActivityIndicator)).not.toThrow();
  });

  it('should render with custom message', () => {
    const customMessage = 'Please wait...';
    const { getByText } = render(<LoadingScreen message={customMessage} />);

    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should always display activity indicator', () => {
    const { UNSAFE_getByType } = render(<LoadingScreen />);

    const activityIndicator = UNSAFE_getByType(
      require('react-native').ActivityIndicator
    );

    expect(activityIndicator.props.size).toBe('large');
    expect(activityIndicator.props.color).toBe('#6366f1');
  });

  it('should have correct container styles', () => {
    const { UNSAFE_getByType } = render(<LoadingScreen />);

    const container = UNSAFE_getByType(require('react-native').View);
    expect(container.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
      })
    );
  });
});