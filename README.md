# 20 Questions Game

A mobile 20 Questions game where players try to guess a secret item by asking yes/no questions to an AI. Built with React Native (Expo) and Supabase.

## Features

- **Natural conversation flow**: Ask questions or make guesses naturally - no explicit guess button needed
- **Smart guess detection**: AI automatically detects when a question is actually a guess
- **Progressive hint system**: Get up to 3 hints that become more helpful as you progress
- **Voice input support**: Speak your questions using speech recognition
- **Multiple categories**: Animals, Food, Objects, Sports/People, Movies/Books
- **Think mode**: AI can take longer to provide more strategic responses
- **Cross-platform**: Runs on iOS, Android, and web

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase CLI
- iOS Simulator or Android Emulator (for mobile testing)

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd 20-questions-game
   cd app && npm install
   ```

2. **Set up Supabase**:
   ```bash
   # Create a Supabase project at https://supabase.com
   supabase db push
   ```

3. **Configure environment**:
   ```bash
   cd app
   cp .env.example .env
   # Add your Supabase URL and anon key to .env
   ```

4. **Run the app**:
   ```bash
   npm start
   ```

## Development

### Common Commands

```bash
# Mobile app
cd app
npm start              # Start Expo development server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm test              # Run tests
npm run test:coverage # Run tests with coverage

# Supabase
supabase start                    # Start local Supabase
supabase functions serve          # Serve edge functions locally
supabase functions deploy <name>  # Deploy specific function
```

### Testing

This project follows Test-Driven Development (TDD) with a minimum 80% code coverage requirement. See [docs/TDD_STANDARDS.md](./docs/TDD_STANDARDS.md) for details.

### Building

See [docs/BUILD_GUIDE.md](./docs/BUILD_GUIDE.md) for detailed build and distribution instructions.

## Architecture

- **Frontend**: React Native with Expo and TypeScript
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Database**: Supabase PostgreSQL
- **LLM**: OpenAI or Anthropic API
- **Shared Types**: TypeScript types in `/shared/types.ts`

## Documentation

- [Build Guide](./docs/BUILD_GUIDE.md) - Building and distribution
- [Testing Guide](./docs/TESTING.md) - Testing setup and guidelines
- [Documentation Standards](./docs/DOCUMENTATION_STANDARDS.md) - Code documentation requirements
- [TDD Standards](./docs/TDD_STANDARDS.md) - Test-driven development requirements
- [App Documentation](./app/README.md) - Frontend details
- [Backend Documentation](./supabase/README.md) - Edge functions and database

## Game Flow

1. Select a category to start a new game
2. Ask yes/no questions to narrow down the secret item
3. The AI automatically detects when you're making a specific guess
4. Use hints strategically (each hint costs 1 question)
5. Try to guess the item in 20 questions or fewer!

## License

[Add license information]