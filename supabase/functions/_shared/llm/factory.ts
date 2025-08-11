import { LLMProvider, LLMConfig } from './types.ts'
import { AnthropicProvider } from './providers/anthropic.ts'
import { OpenAIProvider } from './providers/openai.ts'

export class LLMProviderFactory {
  static createProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'openai':
        return new OpenAIProvider(config)
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`)
    }
  }

  static getSupportedProviders(): string[] {
    return ['anthropic', 'openai']
  }

  static validateProviderName(provider: string): provider is 'anthropic' | 'openai' {
    return ['anthropic', 'openai'].includes(provider)
  }
}