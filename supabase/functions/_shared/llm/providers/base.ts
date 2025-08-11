import { LLMProvider, LLMRequestParams, LLMResponse, LLMConfig } from '../types.ts'

export abstract class BaseLLMProvider implements LLMProvider {
  protected config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
    if (!this.validateConfig()) {
      throw new Error(`Invalid configuration for ${this.name} provider`)
    }
  }

  abstract get name(): string
  abstract generateResponse(params: LLMRequestParams): Promise<LLMResponse>
  abstract validateConfig(): boolean

  protected async makeRequest(
    url: string, 
    options: RequestInit,
    retries = 3
  ): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options)
        
        if (response.ok) {
          return response
        }

        if (response.status === 429 && attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`${this.name} API request failed after ${retries} attempts: ${error.message}`)
        }
        
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`${this.name} API request failed after ${retries} attempts`)
  }

  protected logRequest(params: LLMRequestParams): void {
    console.log(`[${this.name}] Request:`, {
      model: params.model || this.config.model,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      messageCount: params.messages.length,
      systemPrompt: !!params.systemPrompt
    })
  }

  protected logResponse(response: LLMResponse): void {
    console.log(`[${this.name}] Response:`, {
      contentLength: response.content.length,
      usage: response.usage
    })
  }
}