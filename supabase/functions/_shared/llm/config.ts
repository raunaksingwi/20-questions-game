import { LLMConfig } from './types.ts'
import { LLMProviderFactory } from './factory.ts'

export class LLMConfigLoader {
  static loadConfig(functionName?: string): LLMConfig {
    // Allow function-specific overrides
    const providerKey = functionName ? `${functionName.toUpperCase()}_LLM_PROVIDER` : 'LLM_PROVIDER'
    const provider = Deno.env.get(providerKey) || Deno.env.get('LLM_PROVIDER') || 'anthropic'

    if (!LLMProviderFactory.validateProviderName(provider)) {
      throw new Error(`Invalid LLM provider: ${provider}. Supported providers: ${LLMProviderFactory.getSupportedProviders().join(', ')}`)
    }

    const config: LLMConfig = {
      provider,
      apiKey: '',
      model: ''
    }

    switch (provider) {
      case 'anthropic':
        config.apiKey = Deno.env.get('ANTHROPIC_API_KEY') || ''
        config.model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-haiku-20240307'
        break

      case 'openai':
        config.apiKey = Deno.env.get('OPENAI_API_KEY') || ''
        config.model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
        config.organizationId = Deno.env.get('OPENAI_ORG_ID')
        config.baseUrl = Deno.env.get('OPENAI_BASE_URL')
        break

      default:
        throw new Error(`Configuration not implemented for provider: ${provider}`)
    }

    if (!config.apiKey) {
      throw new Error(`API key not found for ${provider} provider. Please set the appropriate environment variable.`)
    }

    return config
  }

  static getDefaultModels() {
    return {
      anthropic: 'claude-3-haiku-20240307',
      openai: 'gpt-4o-mini'
    }
  }

  static getRequiredEnvVars(provider: 'anthropic' | 'openai'): string[] {
    switch (provider) {
      case 'anthropic':
        return ['ANTHROPIC_API_KEY']
      case 'openai':
        return ['OPENAI_API_KEY']
      default:
        return []
    }
  }

  static validateEnvironment(provider?: 'anthropic' | 'openai'): { valid: boolean; missing: string[] } {
    const providers = provider ? [provider] : LLMProviderFactory.getSupportedProviders() as ('anthropic' | 'openai')[]
    const missing: string[] = []

    for (const p of providers) {
      const required = this.getRequiredEnvVars(p)
      for (const envVar of required) {
        if (!Deno.env.get(envVar)) {
          missing.push(envVar)
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }
}