# Supabase Backend - CLAUDE.md

This directory contains the Supabase backend configuration including edge functions, database migrations, and local development setup.

## Architecture Overview

The backend uses Supabase as a Backend-as-a-Service (BaaS) platform providing:
- **PostgreSQL Database**: Game state and conversation storage
- **Edge Functions**: Game logic processing with Deno runtime
- **Real-time**: Live updates for multiplayer features
- **Authentication**: User management and session handling
- **Storage**: File uploads (if needed for future features)

## Project Structure

```
supabase/
├── functions/               # Deno edge functions
│   ├── _shared/            # Shared utilities and services
│   │   ├── common/         # Common utilities
│   │   │   ├── EdgeFunctionBase.ts     # Base class for functions
│   │   │   ├── GameConfig.ts           # Game configuration
│   │   │   └── PerformanceOptimizer.ts # Performance utilities
│   │   ├── llm/            # LLM integration layer
│   │   │   ├── providers/  # LLM provider implementations
│   │   │   │   ├── anthropic.ts        # Claude API integration
│   │   │   │   ├── openai.ts           # OpenAI API integration
│   │   │   │   ├── mock.ts             # Mock provider for testing
│   │   │   │   └── base.ts             # Base provider interface
│   │   │   ├── factory.ts              # Provider factory
│   │   │   ├── config.ts               # LLM configuration
│   │   │   └── types.ts                # LLM type definitions
│   │   ├── logic/          # Game logic modules
│   │   │   └── DecisionTree.ts         # Decision tree for AI responses
│   │   ├── prompts/        # AI prompt templates
│   │   │   ├── PromptTemplate.ts       # Base prompt template
│   │   │   └── AIQuestioningTemplate.ts # AI questioning prompts
│   │   ├── services/       # External service integrations
│   │   │   └── search.ts               # Search utilities
│   │   └── state/          # State management
│   │       └── ConversationState.ts   # Conversation state handling
│   ├── start-game/         # Game initialization function
│   │   ├── index.ts        # Main function implementation
│   │   └── index.test.ts   # Unit tests
│   ├── ask-question/       # Question processing function
│   │   ├── index.ts        # Main function implementation
│   │   └── index.test.ts   # Unit tests
│   ├── get-hint/           # Hint generation function
│   │   ├── index.ts        # Main function implementation
│   │   └── index.test.ts   # Unit tests
│   ├── start-think-round/  # Think mode initialization
│   │   └── index.ts        # Think mode start function
│   ├── finalize-think-result/ # Think mode completion
│   │   └── index.ts        # Think mode finalization
│   ├── submit-user-answer/ # User answer submission
│   │   └── index.ts        # Answer submission function
│   ├── quit-game/          # Game termination
│   │   └── index.ts        # Game quit function
│   ├── make-guess/         # Final guess processing
│   │   └── index.ts        # Guess evaluation function
│   ├── deno.json           # Deno configuration and dependencies
│   └── deno.lock           # Dependency lock file
├── migrations/             # Database schema migrations
│   ├── 001_initial_schema.sql          # Initial database schema
│   ├── 20240806000001_add_unique_constraint.sql
│   ├── 20250809000001_remove_places_random_categories.sql
│   ├── 20250809000002_add_cricketers_category.sql
│   ├── 20250812161247_performance_optimizations.sql
│   ├── 20250812220724_add_think_mode_support.sql
│   ├── 20250812223000_add_transaction_functions.sql
│   ├── 20250813000001_update_categories.sql
│   ├── 20250813000002_rename_cricketers_category.sql
│   ├── 20250813100000_update_game_modes.sql
│   ├── 20250813120000_expand_sample_items.sql
│   └── 20250814120447_add_knowledge_tree_column.sql
└── config.toml             # Supabase local development configuration
```

## Edge Functions

Edge functions are serverless Deno functions that handle game logic and LLM integration.

### Core Functions

#### start-game
- **Purpose**: Initialize new game with selected category
- **Input**: Category selection, user preferences
- **Output**: Game ID, secret item, initial game state
- **LLM Usage**: Generates appropriate secret item for category

#### ask-question
- **Purpose**: Process user questions and generate AI responses
- **Input**: Game ID, user question, conversation history
- **Output**: AI response, updated game state, guess detection
- **LLM Usage**: Contextual yes/no answers, guess detection, conversation management

#### get-hint
- **Purpose**: Generate contextual hints based on conversation
- **Input**: Game ID, conversation history, hint number
- **Output**: Contextual hint, updated hint count
- **LLM Usage**: Progressive hint generation based on previous questions

#### Think Mode Functions
- **start-think-round**: Initiates AI thinking process
- **finalize-think-result**: Processes and stores AI's strategic response
- **submit-user-answer**: Handles user responses to AI questions

### Shared Modules

#### LLM Integration (`_shared/llm/`)
Provides abstracted LLM integration supporting multiple providers:

```typescript
// Provider interface
interface LLMProvider {
  generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse>
  detectGuess(question: string, context: string): Promise<boolean>
  generateHint(context: string, hintNumber: number): Promise<string>
}

// Supported providers
- AnthropicProvider (Claude)
- OpenAIProvider (GPT models)
- MockProvider (testing)
```

#### Game Configuration (`_shared/common/GameConfig.ts`)
Central configuration for game rules and settings:

```typescript
export const GAME_CONFIG = {
  MAX_QUESTIONS: 20,
  MAX_HINTS: 3,
  CATEGORIES: ['animals', 'food', 'objects', 'sports-people', 'movies-books'],
  THINK_MODE_ENABLED: true,
  LLM_TEMPERATURE: 0.3,
  RESPONSE_TIMEOUT: 30000
}
```

## Database Schema

### Core Tables

#### games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL,
  secret_item TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  questions_asked INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  think_mode BOOLEAN DEFAULT false,
  knowledge_tree JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_guess BOOLEAN DEFAULT false,
  ai_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### categories
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sample_items TEXT[],
  enabled BOOLEAN DEFAULT true
);
```

### Performance Optimizations

- **Indexes**: Strategic indexes on frequently queried columns
- **Partitioning**: Game data partitioned by creation date
- **Connection Pooling**: Optimized connection management
- **Query Optimization**: Efficient queries with proper joins

## Local Development

### Setup

1. **Install Supabase CLI**:
   ```bash
   npm install -g @supabase/cli
   ```

2. **Start Local Supabase**:
   ```bash
   supabase start
   ```

3. **Apply Migrations**:
   ```bash
   supabase db push
   ```

4. **Serve Functions Locally**:
   ```bash
   supabase functions serve
   ```

### Configuration

The `config.toml` file configures local development:

- **API**: Port 54321 for REST API
- **Database**: Port 54322 for PostgreSQL
- **Studio**: Port 54323 for Supabase Studio UI
- **Realtime**: Enabled for live updates
- **Auth**: Anonymous and email authentication enabled

### Environment Variables

Edge functions require environment variables:

```bash
# Set in Supabase dashboard or locally
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Testing

### Edge Function Tests

Each function includes comprehensive unit tests:

```bash
# Run all tests
deno task test

# Run specific function tests
deno task test:start-game
deno task test:ask-question
deno task test:get-hint
```

### Test Structure

Tests use Deno's built-in testing framework with mocked dependencies:

```typescript
import { assertEquals } from "@std/assert"

Deno.test("start-game: should create new game", async () => {
  // Mock Supabase client
  const mockSupabase = createMockSupabase()
  
  // Test function
  const response = await startGame(mockRequest, mockSupabase)
  
  // Assertions
  assertEquals(response.status, 200)
  assertEquals(JSON.parse(response.body).success, true)
})
```

## Deployment

### Production Deployment

1. **Deploy Functions**:
   ```bash
   supabase functions deploy start-game
   supabase functions deploy ask-question
   supabase functions deploy get-hint
   ```

2. **Apply Migrations**:
   ```bash
   supabase db push --linked
   ```

3. **Set Environment Variables**:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_key
   supabase secrets set ANTHROPIC_API_KEY=your_key
   ```

### CI/CD Integration

Functions can be deployed automatically via GitHub Actions:

```yaml
- name: Deploy Supabase Functions
  run: |
    supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

## Security

### Function Security

- **CORS**: Properly configured for web app origins
- **Authentication**: JWT token validation for protected endpoints
- **Input Validation**: All inputs sanitized and validated
- **Rate Limiting**: Built-in protection against abuse

### Database Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Policies**: User-specific data access policies
- **API Keys**: Secure key management with rotation

### LLM Security

- **API Key Protection**: Keys stored as encrypted secrets
- **Prompt Injection Prevention**: Input sanitization and validation
- **Response Filtering**: Output validation and safety checks

## Monitoring and Analytics

### Performance Monitoring

- **Function Metrics**: Execution time, memory usage, error rates
- **Database Metrics**: Query performance, connection pooling
- **Real-time Monitoring**: Live function execution logs

### Error Handling

- **Structured Logging**: Consistent error logging across functions
- **Error Recovery**: Graceful degradation and retry logic
- **Alert System**: Notifications for critical errors

## Common Development Tasks

### Adding New Functions

1. Create function directory in `supabase/functions/`
2. Implement function with proper error handling
3. Add unit tests with mocked dependencies
4. Update deployment scripts
5. Document function API and usage

### Modifying Database Schema

1. Create new migration file
2. Write forward and backward migration SQL
3. Test migration locally
4. Deploy to staging environment
5. Apply to production with backup

### LLM Provider Integration

1. Implement provider interface in `_shared/llm/providers/`
2. Add provider to factory configuration
3. Update environment variable documentation
4. Add provider-specific tests
5. Update configuration options

## Troubleshooting

### Common Issues

- **Function Timeouts**: Check LLM API response times
- **Database Connections**: Monitor connection pool usage
- **CORS Errors**: Verify origin configuration
- **Authentication Failures**: Check JWT token validity

### Debugging Tools

- **Supabase Studio**: Visual database management
- **Function Logs**: Real-time execution monitoring
- **Local Development**: Full local stack for testing

### Performance Issues

- **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
- **Function Memory**: Monitor memory usage patterns
- **LLM Latency**: Track API response times
- **Database Indexing**: Add indexes for frequent queries