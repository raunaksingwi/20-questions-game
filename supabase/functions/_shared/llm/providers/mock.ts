import { BaseLLMProvider } from './base.ts'
import { LLMConfig, LLMResponse } from '../types.ts'

export class MockLLMProvider extends BaseLLMProvider {
  constructor(config: LLMConfig) {
    super(config)
  }

  async generateResponse({ messages, temperature, maxTokens }: {
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
    
    // Mock responses for testing
    let mockResponse = ''
    
    if (userMessage.includes('mammal')) {
      mockResponse = '{"answer": "Yes"}'
    } else if (userMessage.includes('fly')) {
      mockResponse = '{"answer": "No"}'
    } else if (userMessage.includes('dog')) {
      mockResponse = '{"answer": "Yes", "is_guess": true}'
    } else if (userMessage.includes('cat')) {
      mockResponse = '{"answer": "No"}'
    } else {
      mockResponse = '{"answer": "Sometimes"}'
    }

    return {
      content: mockResponse,
      usage: {
        promptTokens: 50,
        completionTokens: 10,
        totalTokens: 60
      }
    }
  }

  protected async makeRequest(messages: any[], options: any): Promise<any> {
    // Not used in mock implementation
    return {}
  }

  protected parseResponse(response: any): LLMResponse {
    // Not used in mock implementation
    return { content: '', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
  }
}