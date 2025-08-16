# CLAUDE.md

Essential guidance for Claude Code when working with this 20 Questions game repository.

## Project Overview

20 Questions game: React Native (Expo) + Supabase. Players ask yes/no questions to guess secret items chosen by AI.

## Architecture

- **Frontend**: React Native + Expo + TypeScript (`/app`)
- **Backend**: Supabase Edge Functions + PostgreSQL (`/supabase`)
- **Shared**: TypeScript types (`/shared/types.ts`)

## Project Structure

```
20-questions-game/
├── app/                    # React Native Expo app
│   ├── src/
│   │   ├── screens/       # Game screens
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API and Supabase clients
│   │   └── types/         # App-specific types
│   └── .env              # Environment variables
├── docs/                   # Project documentation
├── supabase/
│   ├── functions/         # Edge functions (game logic)
│   │   ├── start-game/
│   │   ├── ask-question/
│   │   ├── get-hint/
│   │   └── make-guess/
│   └── migrations/        # Database schema
├── shared/
│   └── types.ts          # Shared TypeScript types
└── CLAUDE.md             # Development guidance
```

## Essential Commands

```bash
# Development
cd app && npm start              # Start Expo dev server
npm test && npm run test:coverage # Run tests (80%+ coverage required)
cd supabase/functions && deno test --allow-all # Test edge functions

# Build & Deploy
npm run build:all               # Build all platforms
supabase functions deploy <name> # Deploy edge functions
```

## Critical Requirements

- **TDD Mandatory**: 80%+ test coverage for all code changes
- **Documentation Required**: All code must follow docs/DOCUMENTATION_STANDARDS.md


## When You Need Detailed Docs

**Read these docs as needed for specific tasks:**
- `docs/TDD_STANDARDS.md` - For TDD expectations
- `docs/DOCUMENTATION_STANDARDS.md` - For code documentation requirements
- `docs/TESTING.md` - For test setup and configuration  
- `docs/BUILD_GUIDE.md` - For building and distribution
- `app/README.md` - For frontend implementation details
- `supabase/README.md` - For backend/edge function details
