import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useButtonAnimations } from '../useButtonAnimations';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
  useAnimatedStyle: jest.fn((callback) => callback()),
  withTiming: jest.fn((value, config) => value),
}));

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

describe('useButtonAnimations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useButtonAnimations());
    
    expect(result.current.animatedButtonStyle).toBeDefined();
    expect(result.current.expandButton).toBeInstanceOf(Function);
    expect(result.current.contractButton).toBeInstanceOf(Function);
  });

  it('expands button when expandButton is called', () => {
    const mockWithTiming = require('react-native-reanimated').withTiming;
    const { result } = renderHook(() => useButtonAnimations());
    
    result.current.expandButton();
    
    expect(mockWithTiming).toHaveBeenCalledWith(345, { duration: 200 }); // 375 - 30
    expect(mockWithTiming).toHaveBeenCalledWith(44, { duration: 200 });
    expect(mockWithTiming).toHaveBeenCalledWith(22, { duration: 200 });
  });

  it('contracts button when contractButton is called', () => {
    const mockWithTiming = require('react-native-reanimated').withTiming;
    const { result } = renderHook(() => useButtonAnimations());
    
    result.current.contractButton();
    
    expect(mockWithTiming).toHaveBeenCalledWith(40, { duration: 200 });
    expect(mockWithTiming).toHaveBeenCalledWith(40, { duration: 200 });
    expect(mockWithTiming).toHaveBeenCalledWith(20, { duration: 200 });
  });

  it('uses correct screen width for expansion', () => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 400, height: 800 });
    
    const mockWithTiming = require('react-native-reanimated').withTiming;
    const { result } = renderHook(() => useButtonAnimations());
    
    result.current.expandButton();
    
    expect(mockWithTiming).toHaveBeenCalledWith(370, { duration: 200 }); // 400 - 30
  });

  it('calls useAnimatedStyle with correct callback', () => {
    const mockUseAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    
    renderHook(() => useButtonAnimations());
    
    expect(mockUseAnimatedStyle).toHaveBeenCalledWith(expect.any(Function));
  });
});