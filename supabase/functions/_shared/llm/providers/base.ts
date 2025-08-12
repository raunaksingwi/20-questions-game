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
    retries = 2 // Reduced retries for faster failure
  ): Promise<Response> {
    const startTime = Date.now()
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add request timeout to prevent hanging
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        
        if (response.ok) {
          const duration = Date.now() - startTime
          console.log(`[${this.name}] Request completed in ${duration}ms`)
          return response
        }

        if (response.status === 429 && attempt < retries) {
          const delay = 500 + Math.random() * 1000 // Randomized shorter delay
          console.log(`[${this.name}] Rate limited, retrying in ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      } catch (error) {
        const duration = Date.now() - startTime
        
        if (attempt === retries) {
          console.error(`[${this.name}] Request failed after ${duration}ms and ${retries} attempts`)
          throw new Error(`${this.name} API request failed after ${retries} attempts: ${error.message}`)
        }
        
        const delay = 200 + Math.random() * 300 // Shorter randomized delay
        console.log(`[${this.name}] Request failed, retrying in ${delay}ms`)
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