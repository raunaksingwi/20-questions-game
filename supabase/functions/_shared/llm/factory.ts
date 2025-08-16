/**
 * Factory class for creating and managing different LLM provider instances.
 * Supports Anthropic Claude and OpenAI GPT providers with validation.
 */
import { LLMProvider, LLMConfig } from './types.ts'
import { AnthropicProvider } from './providers/anthropic.ts'
import { OpenAIProvider } from './providers/openai.ts'

export class LLMProviderFactory {
  /**
   * Creates an LLM provider instance based on the configuration.
   * Throws an error for unsupported provider types.
   */
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

  /**
   * Returns a list of all supported LLM provider names.
   */
  static getSupportedProviders(): string[] {
    return ['anthropic', 'openai']
  }

  /**
   * Validates if a provider name is supported and provides type safety.
   */
  static validateProviderName(provider: string): provider is 'anthropic' | 'openai' {
    return ['anthropic', 'openai'].includes(provider)
  }
}