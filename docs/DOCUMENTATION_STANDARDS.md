# Code Documentation Standards

This project maintains comprehensive documentation through structured comments. **ALL** new code and code modifications MUST follow these commenting standards.

## File-Level Comments
Every file must start with a file-level comment explaining its purpose:
```typescript
/**
 * Brief description of what this file does.
 * Explains the main purpose and functionality provided.
 */
```

## Function & Method Comments
Every exported function/method must have a comment explaining what it does:
```typescript
/**
 * Describes what this function does and its primary purpose.
 * Focus on the "what", not the "how".
 */
export function exampleFunction() {
```

## Component Comments
React components must have comments explaining their purpose and usage:
```typescript
/**
 * Component description explaining what it renders and when it's used.
 * Describes the component's role in the application.
 */
export const ExampleComponent: React.FC<Props> = () => {
```

## Interface & Type Comments
All exported interfaces and types must be documented:
```typescript
/**
 * Interface description explaining what data structure this represents.
 */
export interface ExampleInterface {
  /** Description of what this property represents */
  propertyName: string;
  /** Description of this property's purpose */
  optionalProp?: number;
}

/**
 * Type description explaining the purpose of this type definition.
 */
export type ExampleType = 'value1' | 'value2';
```

## Class Comments
Classes require both class-level and method-level documentation:
```typescript
/**
 * Class description explaining the class's purpose and responsibilities.
 */
export class ExampleClass {
  /**
   * Constructor description explaining initialization purpose.
   */
  constructor() {}
  
  /**
   * Method description explaining what this method does.
   */
  public exampleMethod(): void {}
}
```

## Constant & Variable Comments
Exported constants and complex variables need documentation:
```typescript
/**
 * Description of what this constant represents and how it's used.
 */
export const EXAMPLE_CONSTANT = {
  /** Description of this property */
  property: 'value'
};
```

## Comment Guidelines

### What TO Include:
- **Purpose**: What the code does (the "what")
- **Usage**: When/how the code is used
- **Parameters**: What each parameter represents (in interfaces)
- **Return values**: What functions return (when not obvious)
- **Component roles**: How components fit in the UI

### What NOT to Include:
- **Implementation details**: How the code works internally
- **Obvious statements**: Comments that just repeat the code
- **Temporary notes**: Use TODO comments for temporary notes
- **Personal opinions**: Keep comments factual and professional

## Maintenance Requirements

### When Writing New Code:
1. Add file-level comment first
2. Add function/component/class comments as you write them
3. Document all exported interfaces and types
4. Add property descriptions for interface fields

### When Modifying Existing Code:
1. **Update existing comments** to reflect changes
2. Add comments to new functions/components/exports
3. Remove comments that are no longer accurate
4. Ensure comment accuracy matches the implementation

### Review Checklist:
Before submitting any code changes, verify:
- [ ] File has appropriate file-level comment
- [ ] All new exports have descriptive comments
- [ ] Modified functions have updated comments
- [ ] Interface properties have descriptions
- [ ] Comments focus on "what" not "how"
- [ ] No outdated or inaccurate comments remain

## Examples by File Type

### React Native Components:
```typescript
/**
 * Loading screen component with customizable message.
 * Displays centered spinner with optional status text.
 */
export const LoadingScreen: React.FC<LoadingProps> = ({ message }) => {
```

### Custom Hooks:
```typescript
/**
 * Hook for managing voice recording with speech recognition.
 * Handles permissions, recording state, and speech-to-text conversion.
 */
export const useVoiceRecording = (onResult: (text: string) => void) => {
```

### Service Classes:
```typescript
/**
 * Service for handling game-related API calls to Supabase.
 * Provides methods for game lifecycle and player interactions.
 */
class GameService {
  /**
   * Starts a new game with specified category and mode.
   */
  async startGame(category: string): Promise<StartGameResponse> {}
}
```

### Edge Functions:
```typescript
/**
 * Edge function that processes user questions in the 20 Questions game.
 * Uses LLM to generate contextually appropriate responses.
 */
const handler = async (req: Request) => {
```

### Shared Types:
```typescript
/**
 * Interface representing a game instance in the database.
 */
export interface Game {
  /** Unique identifier for the game */
  id: string;
  /** The secret item being guessed */
  secret_item: string;
}
```

## Enforcement

This documentation standard ensures code maintainability, onboarding efficiency, and long-term project sustainability. **Failure to follow these standards will require code revision before acceptance.**