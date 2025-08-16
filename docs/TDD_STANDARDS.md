# Test-Driven Development (TDD) Standards

This project **REQUIRES** Test-Driven Development for all code changes. TDD is not optional - it is a mandatory development practice that must be followed for all features, bug fixes, and code modifications.

## TDD Workflow - MANDATORY

### 1. RED Phase - Write Failing Tests First
**BEFORE writing any implementation code:**

```typescript
// Example: Adding a new function
describe('calculateGameScore', () => {
  it('should return 100 points for 1 question used', () => {
    const result = calculateGameScore(1, 20);
    expect(result).toBe(100);
  });
  
  it('should return 50 points for 10 questions used', () => {
    const result = calculateGameScore(10, 20);
    expect(result).toBe(50);
  });
  
  it('should return 0 points for all questions used', () => {
    const result = calculateGameScore(20, 20);
    expect(result).toBe(0);
  });
});
```

**Requirements:**
- [ ] Write test cases that describe the expected behavior
- [ ] Run tests to confirm they FAIL (RED phase)
- [ ] Do NOT write implementation code yet

### 2. GREEN Phase - Write Minimal Implementation
**ONLY after tests are written and failing:**

```typescript
// Minimal implementation to make tests pass
export function calculateGameScore(questionsUsed: number, totalQuestions: number): number {
  if (questionsUsed >= totalQuestions) return 0;
  return Math.round((1 - questionsUsed / totalQuestions) * 100);
}
```

**Requirements:**
- [ ] Write the MINIMUM code needed to make tests pass
- [ ] Run tests to confirm they PASS (GREEN phase)
- [ ] Do NOT add extra features not covered by tests

### 3. REFACTOR Phase - Improve Code Quality
**ONLY after tests are passing:**

```typescript
// Refactored version with better structure
export function calculateGameScore(questionsUsed: number, totalQuestions: number): number {
  validateGameScoreInputs(questionsUsed, totalQuestions);
  
  if (questionsUsed >= totalQuestions) {
    return MIN_SCORE;
  }
  
  const efficiency = (totalQuestions - questionsUsed) / totalQuestions;
  return Math.round(efficiency * MAX_SCORE);
}

const MIN_SCORE = 0;
const MAX_SCORE = 100;

function validateGameScoreInputs(questionsUsed: number, totalQuestions: number): void {
  if (questionsUsed < 0 || totalQuestions <= 0) {
    throw new Error('Invalid game score parameters');
  }
}
```

**Requirements:**
- [ ] Improve code structure, readability, and performance
- [ ] Run tests to ensure they still PASS
- [ ] Add more tests if refactoring reveals edge cases

## Enforcement Rules

### For New Features
**MANDATORY SEQUENCE:**

1. **Write comprehensive tests FIRST**
   - Unit tests for all functions
   - Component tests for UI components
   - Integration tests for API calls
   - Edge case and error handling tests

2. **Implement minimal code to pass tests**
   - No extra features beyond test requirements
   - Focus on making tests green

3. **Refactor and improve**
   - Optimize performance
   - Improve readability
   - Extract reusable components

### For Bug Fixes
**MANDATORY SEQUENCE:**

1. **Write a test that reproduces the bug**
   ```typescript
   // Bug: Game crashes when category is null
   it('should handle null category gracefully', () => {
     expect(() => startGame(null)).not.toThrow();
     // or
     expect(startGame(null)).toEqual({ error: 'Category required' });
   });
   ```

2. **Confirm the test FAILS** (proving the bug exists)

3. **Fix the bug** with minimal changes

4. **Confirm the test PASSES** (proving the bug is fixed)

### For Code Modifications
**BEFORE modifying existing code:**

1. **Ensure existing tests cover the code** you're about to change
2. **Add missing tests** if coverage is incomplete
3. **Follow TDD workflow** for any new functionality
4. **Refactor safely** knowing tests will catch regressions

## Testing Requirements by Code Type

### React Native Components
```typescript
// Required test categories:
describe('GameHeader', () => {
  // Rendering tests
  it('should render with required props', () => {});
  it('should display correct question count', () => {});
  
  // Interaction tests  
  it('should call onHintPress when hint button clicked', () => {});
  it('should disable buttons when game is inactive', () => {});
  
  // State tests
  it('should show WIN button only in AI guessing mode', () => {});
  
  // Error/Edge case tests
  it('should handle missing props gracefully', () => {});
});
```

### Custom Hooks
```typescript
// Required test categories:
describe('useGameState', () => {
  // Initial state tests
  it('should initialize with default state', () => {});
  
  // State update tests
  it('should update questions remaining when action called', () => {});
  
  // Side effect tests
  it('should trigger cleanup on unmount', () => {});
  
  // Error handling tests
  it('should handle invalid state updates', () => {});
});
```

### Service Classes
```typescript
// Required test categories:
describe('GameService', () => {
  // Success path tests
  it('should start game successfully with valid category', async () => {});
  
  // Error handling tests
  it('should throw error when Supabase is unavailable', async () => {});
  
  // Edge case tests
  it('should handle network timeouts gracefully', async () => {});
  
  // Mocking tests (using MSW or similar)
  it('should call correct API endpoint with proper payload', async () => {});
});
```

### Edge Functions
```typescript
// Required test categories:
describe('start-game handler', () => {
  // Happy path tests
  it('should create game with valid request', async () => {});
  
  // Validation tests
  it('should reject invalid category', async () => {});
  
  // Authentication tests
  it('should work with anonymous users', async () => {});
  
  // Database tests
  it('should handle database connection errors', async () => {});
  
  // LLM integration tests
  it('should handle LLM provider failures', async () => {});
});
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Overall**: 80% minimum
- **Functions**: 85% minimum  
- **Lines**: 80% minimum
- **Branches**: 75% minimum

### Coverage Commands
```bash
# React Native app
cd app && npm run test:coverage

# Edge functions  
cd supabase/functions && deno test --coverage --allow-all

# Coverage enforcement
npm run test:coverage:enforce  # Fails if below thresholds
```

## Pre-Submission Checklist

**BEFORE submitting any code changes, verify:**

- [ ] **ALL new functionality has tests written FIRST**
- [ ] **ALL tests are passing** (`npm test` and edge function tests)
- [ ] **Coverage thresholds are met** (80%+ overall)
- [ ] **Bug fixes include reproducing tests**
- [ ] **Refactoring maintains test coverage**
- [ ] **Integration tests cover API changes**
- [ ] **Edge cases and error conditions are tested**

## Common TDD Violations - WILL BE REJECTED

❌ **Writing implementation code before tests**
❌ **Skipping tests for "simple" functions**
❌ **Adding tests after implementation (Test-Last Development)**
❌ **Insufficient test coverage (<80%)**
❌ **Not testing error conditions**
❌ **Not testing edge cases**
❌ **Modifying code without ensuring test coverage**
❌ **Submitting code with failing tests**

## Testing Tools and Setup

### React Native Testing Stack
- **Jest**: Test runner and assertions
- **React Native Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **@testing-library/jest-native**: Additional matchers

### Edge Function Testing Stack
- **Deno Test**: Built-in test runner
- **Mock modules**: For Supabase and LLM providers
- **Test fixtures**: Sample data for consistent tests

### Test Organization
```
__tests__/
├── components/           # Component tests
├── hooks/               # Hook tests  
├── services/            # Service tests
├── utils/               # Utility function tests
├── integration/         # Cross-system tests
└── fixtures/            # Test data and mocks
```

## TDD Benefits in This Project

1. **Reliable Voice Input**: TDD ensures voice recording edge cases are handled
2. **Robust Game Logic**: LLM integration complexity requires comprehensive testing
3. **Cross-Platform Compatibility**: Tests catch platform-specific issues early
4. **API Reliability**: Edge function tests prevent backend regressions
5. **Refactoring Confidence**: Tests enable safe code improvements

## Enforcement and Review

**Code reviews will specifically check:**
- [ ] Evidence of TDD workflow (test commits before implementation)
- [ ] Test coverage reports meet thresholds
- [ ] Test quality and comprehensiveness
- [ ] Proper mocking of external dependencies
- [ ] Integration test coverage for new features

**Automated enforcement:**
- CI pipeline runs all tests on every commit
- Coverage reports block PRs below thresholds
- Pre-commit hooks run relevant test suites

## Getting Help with TDD

If you're struggling with TDD implementation:

1. **Start small**: Begin with simple utility functions
2. **Use existing tests as examples**: Follow patterns in the codebase  
3. **Ask for help**: Request TDD guidance in code review comments
4. **Pair programming**: Work with someone experienced in TDD

**Remember: TDD is not optional - it's how we ensure code quality, prevent regressions, and maintain confidence in our codebase.**