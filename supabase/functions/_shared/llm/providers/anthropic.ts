import { BaseLLMProvider } from './base.ts'
import { LLMRequestParams, LLMResponse, LLMConfig } from '../types.ts'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicRequest {
  model: string
  messages: AnthropicMessage[]
  system?: string
  temperature: number
  max_tokens: number
}

interface AnthropicResponse {
  content: Array<{
    type: string
    text: string
  }>
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export class AnthropicProvider extends BaseLLMProvider {
  get name(): string {
    return 'anthropic'
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.model &&
      this.config.provider === 'anthropic'
    )
  }

  async generateResponse(params: LLMRequestParams): Promise<LLMResponse> {
    this.logRequest(params)

    const messages: AnthropicMessage[] = params.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))

    const systemPrompt = params.systemPrompt || 
      params.messages.find(msg => msg.role === 'system')?.content

    const requestBody: AnthropicRequest = {
      model: params.model || this.config.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens
    }

    if (systemPrompt) {
      requestBody.system = systemPrompt
    }

    const response = await this.makeRequest(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    const data: AnthropicResponse = await response.json()
    
    const llmResponse: LLMResponse = {
      content: data.content[0]?.text || '',
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    }

    this.logResponse(llmResponse)
    return llmResponse
  }
}