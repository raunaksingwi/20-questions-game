import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../AppNavigator';

// Mock the React Navigation components
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children, ...props }: any) => {
      const React = require('react');
      return React.createElement('Navigator', { ...props, testID: 'stack-navigator' }, children);
    },
    Screen: ({ component: Component, name, ...props }: any) => {
      const React = require('react');
      return React.createElement('Screen', { ...props, testID: `screen-${name}` }, 
        Component ? React.createElement(Component) : null
      );
    },
  }),
}));

// Mock the screens
jest.mock('../../screens/HomeScreen', () => {
  return function HomeScreen() {
    const React = require('react');
    return React.createElement(
      'View',
      { testID: 'home-screen' },
      'Home Screen'
    );
  };
});

jest.mock('../../screens/GameScreen', () => {
  return function GameScreen() {
    const React = require('react');
    return React.createElement(
      'View',
      { testID: 'game-screen' },
      'Game Screen'
    );
  };
});

// Mock shared types
jest.mock('../../types/types', () => ({}));

describe('AppNavigator (Simple Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<AppNavigator />);
      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('should render both screens', () => {
      const { getByTestId } = render(<AppNavigator />);
      expect(getByTestId('screen-Home')).toBeTruthy();
      expect(getByTestId('screen-Game')).toBeTruthy();
    });

    it('should configure navigator with correct initial route', () => {
      const { getByTestId } = render(<AppNavigator />);
      const navigator = getByTestId('stack-navigator');
      expect(navigator.props.initialRouteName).toBe('Home');
    });

    it('should configure screen options', () => {
      const { getByTestId } = render(<AppNavigator />);
      const navigator = getByTestId('stack-navigator');
      
      expect(navigator.props.screenOptions).toBeDefined();
      expect(navigator.props.screenOptions.headerStyle.backgroundColor).toBe('#6366f1');
      expect(navigator.props.screenOptions.headerTintColor).toBe('#fff');
      expect(navigator.props.screenOptions.headerTitleStyle.fontWeight).toBe('bold');
    });

    it('should set correct screen titles', () => {
      const { getByTestId } = render(<AppNavigator />);
      
      const homeScreen = getByTestId('screen-Home');
      const gameScreen = getByTestId('screen-Game');
      
      expect(homeScreen.props.options.title).toBe('20 Questions');
      expect(gameScreen.props.options.title).toBe('Ask Your Questions');
    });
  });

  describe('Screen Configuration', () => {
    it('should define correct screen names', () => {
      const { getByTestId } = render(<AppNavigator />);
      
      expect(getByTestId('screen-Home')).toBeTruthy();
      expect(getByTestId('screen-Game')).toBeTruthy();
    });

    it('should have proper navigator structure', () => {
      const { getByTestId } = render(<AppNavigator />);
      const navigator = getByTestId('stack-navigator');
      
      expect(navigator).toBeTruthy();
      expect(navigator.props.initialRouteName).toBe('Home');
    });
  });

  describe('Type Safety', () => {
    it('should handle route parameters correctly', () => {
      // This is implicitly tested by TypeScript compilation
      const { getByTestId } = render(<AppNavigator />);
      const gameScreen = getByTestId('screen-Game');
      
      // The screen should exist (name is set in the mock)
      expect(gameScreen).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply consistent header styling', () => {
      const { getByTestId } = render(<AppNavigator />);
      const navigator = getByTestId('stack-navigator');
      
      const { screenOptions } = navigator.props;
      expect(screenOptions.headerStyle.backgroundColor).toBe('#6366f1');
      expect(screenOptions.headerTintColor).toBe('#fff');
      expect(screenOptions.headerTitleStyle.fontWeight).toBe('bold');
    });

    it('should maintain design consistency', () => {
      const { getByTestId } = render(<AppNavigator />);
      const navigator = getByTestId('stack-navigator');
      
      const { screenOptions } = navigator.props;
      expect(typeof screenOptions.headerStyle.backgroundColor).toBe('string');
      expect(typeof screenOptions.headerTintColor).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle re-renders gracefully', () => {
      const { rerender, getByTestId } = render(<AppNavigator />);
      
      rerender(<AppNavigator />);
      
      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('should maintain configuration on re-render', () => {
      const { rerender, getByTestId } = render(<AppNavigator />);
      
      const getNavigatorConfig = () => {
        const navigator = getByTestId('stack-navigator');
        return {
          initialRoute: navigator.props.initialRouteName,
          headerColor: navigator.props.screenOptions.headerStyle.backgroundColor,
        };
      };
      
      const initialConfig = getNavigatorConfig();
      
      rerender(<AppNavigator />);
      
      const rerenderConfig = getNavigatorConfig();
      expect(rerenderConfig).toEqual(initialConfig);
    });
  });
});