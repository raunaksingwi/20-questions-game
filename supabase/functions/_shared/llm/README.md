# Hot-Swappable LLM Provider Architecture

This module provides a flexible, hot-swappable LLM provider system for the 20 Questions game. It allows you to easily switch between different LLM providers (Anthropic, OpenAI) without changing any application code.

## Features

- 🔄 **Hot-swappable**: Change providers via environment variables
- 🎯 **Provider-specific overrides**: Use different providers for different functions
- 🛡️ **Error handling**: Robust error handling with retry logic
- 📊 **Usage tracking**: Token usage monitoring and logging
- 🧪 **Testing**: Built-in testing utilities
- 🔧 **Type-safe**: Full TypeScript support

## Quick Start

1. **Configuration**
   
   Create a `.env` file in your project root:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and set your configuration:
   ```bash
   # Set your preferred provider
   LLM_PROVIDER=anthropic  # or 'openai'
   
   # Set provider-specific API keys
   ANTHROPIC_API_KEY=your_actual_api_key_here
   OPENAI_API_KEY=your_actual_api_key_here
   
   # Supabase credentials
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

2. **Usage in Edge Functions**
   ```typescript
   import { LLMConfigLoader, LLMProviderFactory } from '../_shared/llm/index.ts'
   
   // Load configuration and create provider
   const config = LLMConfigLoader.loadConfig('function-name')
   const provider = LLMProviderFactory.createProvider(config)
   
   // Generate response
   const response = await provider.generateResponse({
     messages: chatMessages,
     temperature: 0.1,
     maxTokens: 50
   })
   ```

## Supported Providers

### Anthropic (Claude)
- **Default Model**: `claude-3-haiku-20240307`
- **Required Env Var**: `ANTHROPIC_API_KEY`
- **Optional Env Var**: `ANTHROPIC_MODEL`

### OpenAI
- **Default Model**: `gpt-4o-mini`
- **Required Env Var**: `OPENAI_API_KEY`
- **Optional Env Vars**: 
  - `OPENAI_MODEL`
  - `OPENAI_ORG_ID`
  - `OPENAI_BASE_URL`

## Environment Variables

### Global Configuration
```bash
# Default provider for all functions
LLM_PROVIDER=anthropic|openai
```

### Function-Specific Overrides
```bash
# Override provider for specific functions
ASK_QUESTION_LLM_PROVIDER=openai
GET_HINT_LLM_PROVIDER=anthropic
```

### Provider-Specific Settings
```bash
# Anthropic
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-3-haiku-20240307

# OpenAI
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_ORG_ID=your_org_id
OPENAI_BASE_URL=https://api.openai.com
```

## Architecture

```
_shared/llm/
├── types.ts              # TypeScript interfaces
├── factory.ts            # Provider factory
├── config.ts             # Configuration loader
├── response-parser.ts    # Response parsing utilities
├── providers/
│   ├── base.ts          # Base provider class
│   ├── anthropic.ts     # Anthropic implementation
│   └── openai.ts        # OpenAI implementation
├── test.ts              # Testing utilities
├── index.ts             # Main exports
└── README.md            # This file
```

## Testing

Run the built-in tests to verify your configuration:

```bash
deno run --allow-env --allow-net supabase/functions/_shared/llm/test.ts
```

This will test all configured providers and validate your setup.

## Response Parsing

The system includes robust response parsing that handles:
- JSON responses from LLMs
- Plain text fallbacks
- Game-specific response validation
- Hint parsing and cleaning

## Error Handling

- **Automatic retries** with exponential backoff
- **Rate limit handling** with proper delays
- **Comprehensive logging** for debugging
- **Validation errors** for configuration issues

## Adding New Providers

To add a new provider:

1. Create a new file in `providers/` extending `BaseLLMProvider`
2. Implement the required methods:
   - `get name(): string`
   - `generateResponse(params): Promise<LLMResponse>`
   - `validateConfig(): boolean`
3. Add the provider to `factory.ts`
4. Update `config.ts` with configuration logic
5. Add environment variable documentation

## Migration Guide

This architecture is fully backward compatible. Existing functions will continue to work without changes, defaulting to the Anthropic provider if no configuration is specified.

To migrate existing functions:

1. Replace direct API calls with the provider system
2. Update imports to use the shared module
3. Set environment variables for your preferred providers
4. Test thoroughly with both providers

## Performance Considerations

- **Provider selection** happens once per request (minimal overhead)
- **Token usage tracking** for cost optimization
- **Connection reuse** for better performance
- **Configurable timeouts** and retry logic