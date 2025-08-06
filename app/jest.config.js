module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|expo-.*|@unimodules|unimodules|sentry-expo|native-base|@react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|@react-native-async-storage|react-native-url-polyfill|react-native-worklets))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo$': '<rootDir>/__mocks__/expo.js',
    '^expo/(.*)$': '<rootDir>/__mocks__/expo.js',
    '^../../../shared/types$': '<rootDir>/__mocks__/shared-types.js',
    '^../../../../shared/types$': '<rootDir>/__mocks__/shared-types.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ogg)$': 'identity-obj-proxy',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!**/node_modules/**',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
};