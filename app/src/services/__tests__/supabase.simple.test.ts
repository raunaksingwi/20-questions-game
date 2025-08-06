import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock Supabase client
const mockClient = { auth: {}, from: jest.fn() };
const mockCreateClient = jest.fn(() => mockClient);

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Mock URL polyfill
jest.mock('react-native-url-polyfill/auto', () => {});

describe('Supabase Configuration (Simple Test)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockCreateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when environment variables are missing', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '';

      // Use dynamic import to avoid module caching issues
      expect(() => {
        jest.isolateModules(() => {
          require('../supabase');
        });
      }).toThrow('Missing Supabase environment variables');
    });

    it('should create client with valid environment variables', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      jest.isolateModules(() => {
        const { supabase } = require('../supabase');
        expect(supabase).toBe(mockClient);
      });

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          }),
        })
      );
    });

    it('should configure auth correctly', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      jest.isolateModules(() => {
        require('../supabase');
      });

      const authConfig = mockCreateClient.mock.calls[0][2].auth;
      expect(authConfig.storage).toBe(AsyncStorage);
      expect(authConfig.autoRefreshToken).toBe(true);
      expect(authConfig.persistSession).toBe(true);
      expect(authConfig.detectSessionInUrl).toBe(false);
    });

    it('should handle URL polyfill import', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      // The polyfill should be imported when the module is required
      jest.isolateModules(() => {
        require('../supabase');
      });

      // Verify the module was imported (tested by the module being loaded successfully)
      expect(mockCreateClient).toHaveBeenCalled();
    });
  });

  describe('Client Export', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    });

    it('should export supabase client', () => {
      jest.isolateModules(() => {
        const { supabase } = require('../supabase');
        expect(supabase).toBeDefined();
        expect(supabase).toBe(mockClient);
      });
    });

    it('should use correct configuration', () => {
      jest.isolateModules(() => {
        require('../supabase');
      });

      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object)
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle undefined environment variables', () => {
      // Set to undefined explicitly (deleting may not work as expected)
      process.env.EXPO_PUBLIC_SUPABASE_URL = undefined;
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = undefined;

      expect(() => {
        jest.isolateModules(() => {
          require('../supabase');
        });
      }).toThrow('Missing Supabase environment variables');
    });

    it('should handle empty string environment variables', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '';

      expect(() => {
        jest.isolateModules(() => {
          require('../supabase');
        });
      }).toThrow('Missing Supabase environment variables');
    });
  });
});