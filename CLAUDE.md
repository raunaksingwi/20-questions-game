# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 20 Questions game application where players try to guess a secret item by asking yes/no questions to an LLM. Built with React Native (Expo) for mobile and Supabase for the backend.

## Architecture

- **Frontend**: React Native with Expo and TypeScript
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Database**: Supabase PostgreSQL
- **LLM**: OpenAI or Anthropic API (configured in edge functions)
- **Shared Types**: TypeScript types in `/shared/types.ts`

## Project Structure

```
20-questions-app/
├── app/                    # React Native Expo app
│   ├── src/
│   │   ├── screens/       # Game screens
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API and Supabase clients
│   │   └── types/         # App-specific types
│   └── .env              # Environment variables (create from .env.example)
├── supabase/
│   ├── functions/         # Edge functions (game logic)
│   │   ├── start-game/
│   │   ├── ask-question/
│   │   ├── get-hint/
│   │   └── make-guess/
│   └── migrations/        # Database schema
└── shared/
    └── types.ts          # Shared TypeScript types
```

## Development Setup

1. **Supabase Setup**:
   - Create a new Supabase project at https://supabase.com
   - Run the migration: `supabase db push` (after installing Supabase CLI)
   - Set up environment variables in edge functions (OPENAI_API_KEY)

2. **Mobile App Setup**:
   ```bash
   cd app
   cp .env.example .env
   # Add your Supabase URL and anon key to .env
   npm install
   ```

## Common Commands

```bash
# Mobile app development
cd app
npm start                 # Start Expo development server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in web browser

# Testing
npm test                 # Run React Native tests
npm run test:coverage    # Run tests with coverage
cd supabase/functions && deno test --allow-all  # Run edge function tests

# Building and deployment
npm run build:android:debug     # Build Android debug APK
npm run build:android:release   # Build Android release APK
npm run build:android:bundle    # Build Android AAB for Play Store
npm run build:ios              # Build iOS archive and IPA
npm run build:all              # Build all platforms

# Supabase local development
supabase start           # Start local Supabase
supabase functions serve # Serve edge functions locally
supabase db push        # Apply migrations

# Deploy edge functions
supabase functions deploy start-game
supabase functions deploy ask-question
supabase functions deploy get-hint
```

## Game Flow

1. User selects category → `start-game` function creates game with secret item
2. User asks questions/makes guesses → `ask-question` function uses LLM to:
   - Answer yes/no questions normally
   - Auto-detect when user is making a specific guess
   - End game immediately when correct guess is detected
   - Continue game when wrong guess is detected (just answers "No")
3. User can request hints → `get-hint` function provides contextual hints (max 3, each costs 1 question)

## Key Features

- **Natural conversation flow**: No explicit guess button - just ask questions or make guesses naturally
- **Smart guess detection**: LLM automatically detects when a question is actually a guess
- **Progressive hint system**: Hints get more helpful as questions increase (each costs 1 question)
- **Voice input support**: Speak your questions using speech recognition
- **Conversation history**: Stored in database for context rebuilding
- **Support for authenticated and anonymous play**
- **Categories**: Animals, Food, Objects, Sports/People, Movies/Books
- **Think mode**: AI can take longer to think and provide more strategic responses
- **Comprehensive testing**: 80%+ test coverage for both React Native app and edge functions

## Documentation

For detailed information about specific aspects of the project:

- **Building and Distribution**: See [BUILD_GUIDE.md](./BUILD_GUIDE.md)
- **Testing Setup and Guidelines**: See [TESTING.md](./TESTING.md)
- **App-specific Documentation**: See [app/CLAUDE.md](./app/CLAUDE.md)
- **Backend Documentation**: See [supabase/CLAUDE.md](./supabase/CLAUDE.md)
- **Type Definitions**: See [shared/CLAUDE.md](./shared/CLAUDE.md)
- Always follow test driven development