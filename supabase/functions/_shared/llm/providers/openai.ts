import { BaseLLMProvider } from './base.ts'
import { LLMRequestParams, LLMResponse, LLMConfig } from '../types.ts'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIFunction {
  name: string
  description: string
  parameters: object
}

interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature: number
  max_tokens: number
  functions?: OpenAIFunction[]
  function_call?: 'auto' | 'none' | { name: string }
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null
      function_call?: {
        name: string
        arguments: string
      }
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAIProvider extends BaseLLMProvider {
  get name(): string {
    return 'openai'
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.model &&
      this.config.provider === 'openai'
    )
  }

  async generateResponse(params: LLMRequestParams): Promise<LLMResponse> {
    this.logRequest(params)

    const messages: OpenAIMessage[] = []

    // Add system message first if present
    const systemPrompt = params.systemPrompt || 
      params.messages.find(msg => msg.role === 'system')?.content

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    // Add other messages, excluding system messages since we handled it above
    messages.push(
      ...params.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
    )

    const requestBody: OpenAIRequest = {
      model: params.model || this.config.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens
    }

    // Add functions if provided
    if (params.functions && params.functions.length > 0) {
      requestBody.functions = params.functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      }))
      
      if (params.function_call) {
        requestBody.function_call = params.function_call
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    }

    if (this.config.organizationId) {
      headers['OpenAI-Organization'] = this.config.organizationId
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com'
    const response = await this.makeRequest(
      `${baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }
    )

    const data: OpenAIResponse = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response choices returned from OpenAI')
    }

    const message = data.choices[0].message
    const llmResponse: LLMResponse = {
      content: message.content || '',
      function_call: message.function_call ? {
        name: message.function_call.name,
        arguments: message.function_call.arguments
      } : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    }

    this.logResponse(llmResponse)
    return llmResponse
  }
}