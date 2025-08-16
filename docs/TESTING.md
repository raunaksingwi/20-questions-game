# Testing Guide

This document outlines the testing setup and how to run tests for the 20 Questions game application.

## Overview

The project has comprehensive tests covering:

- **React Native App**: Jest with React Native Testing Library
- **Supabase Edge Functions**: Deno's built-in testing framework

## React Native App Tests

### Setup

The React Native app uses Jest with the following testing stack:

- **Jest**: Test runner and assertion library
- **React Native Testing Library**: Component testing utilities
- **MSW**: API mocking (for HTTP requests)

### Test Structure

```
app/
├── src/
│   ├── screens/
│   │   └── __tests__/
│   │       ├── GameScreen.test.tsx
│   │       └── HomeScreen.test.tsx
│   ├── services/
│   │   └── __tests__/
│   │       ├── gameService.test.ts
│   │       └── AudioManager.test.ts
│   └── components/
│       └── __tests__/
│           ├── GameResultModal.test.tsx
│           ├── LoadingScreen.test.tsx
│           └── VoiceInputButton.test.tsx
├── jest.config.js
├── jest.setup.js
└── package.json
```

### Running Tests

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The React Native tests cover:

- **Screen Components**: User interactions, navigation, state management
- **Service Layer**: API calls, error handling, data transformation
- **UI Components**: Rendering, styling, user interactions
- **Audio Management**: Sound playback, recording coordination

## Supabase Edge Functions Tests

### Setup

Edge functions use Deno's built-in testing framework with:

- **Deno Test**: Native test runner
- **@std/assert**: Assertion library
- **Mocked dependencies**: Supabase client and external APIs

### Test Structure

```
supabase/
├── functions/
│   ├── start-game/
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── ask-question/
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── get-hint/
│   │   ├── index.ts
│   │   └── index.test.ts
│   └── deno.json
```

### Running Tests

```bash
# Navigate to functions directory
cd supabase/functions

# Run all tests
deno test --allow-all

# Run specific function tests
deno test --allow-all start-game/
deno test --allow-all ask-question/
deno test --allow-all get-hint/

# Run tests with detailed output
deno test --allow-all --reporter=verbose
```

Or use the predefined tasks:

```bash
# Run all tests
deno task test

# Run specific function tests
deno task test:start-game
deno task test:ask-question
deno task test:get-hint
```

### Test Coverage

The edge function tests cover:

- **Game Creation**: Category selection, random item assignment
- **Question Processing**: LLM integration, guess detection, game state management
- **Hint System**: Context-aware hints, progressive difficulty, usage limits
- **Error Handling**: Invalid requests, database errors, API failures
- **CORS Handling**: Cross-origin request support

## Test Data and Mocking

### React Native Mocks

The Jest setup includes mocks for:

- **Expo modules**: Audio, Haptics, Speech Recognition
- **React Navigation**: Navigation hooks and components
- **Supabase**: Database client and authentication
- **External libraries**: Vector icons, gesture handlers

### Edge Function Mocks

Edge function tests mock:

- **Supabase Client**: Database operations with predictable responses
- **Anthropic API**: LLM responses for consistent testing
- **Environment Variables**: API keys and configuration

## Test Patterns and Best Practices

### React Native Testing

1. **Component Testing**: Test user interactions and state changes
2. **Service Testing**: Mock external dependencies and test business logic
3. **Error Scenarios**: Test error handling and edge cases
4. **Accessibility**: Ensure components are accessible

### Edge Function Testing

1. **Pure Functions**: Test business logic in isolation
2. **Integration**: Test full request/response cycles
3. **Error Handling**: Test various failure scenarios
4. **Data Validation**: Test input validation and sanitization

## Continuous Integration

For CI/CD pipelines, run tests with:

```bash
# React Native tests
cd app && npm ci && npm test -- --ci --coverage --watchAll=false

# Edge function tests
cd supabase/functions && deno test --allow-all
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure Deno has `--allow-all` permissions for edge function tests
2. **Mock Failures**: Verify mock implementations match actual API interfaces
3. **Timeout Issues**: Increase Jest timeout for slow tests
4. **Environment Variables**: Ensure test environment variables are set

### Debugging Tests

- Use `console.log` statements in tests for debugging
- Run tests in watch mode for rapid iteration
- Use Jest's `--verbose` flag for detailed output
- Check mock implementation accuracy

## Adding New Tests

### React Native

1. Create test file in `__tests__` directory
2. Import testing utilities and component
3. Mock external dependencies
4. Write test cases covering functionality
5. Follow existing patterns and naming conventions

### Edge Functions

1. Create `.test.ts` file next to function
2. Import Deno testing utilities
3. Mock Supabase and external APIs
4. Test request/response cycles
5. Cover error scenarios and edge cases

## Performance Testing

While not included in this setup, consider adding:

- **Load testing** for edge functions
- **Performance monitoring** for React Native components
- **Memory leak detection** for long-running operations