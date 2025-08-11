export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMRequestParams {
  messages: ChatMessage[]
  systemPrompt?: string
  temperature: number
  maxTokens: number
  model?: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMProvider {
  name: string
  generateResponse(params: LLMRequestParams): Promise<LLMResponse>
  validateConfig(): boolean
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai'
  apiKey: string
  model: string
  organizationId?: string // For OpenAI
  baseUrl?: string // For custom endpoints
}

export interface GameLLMResponse {
  answer: string
  is_guess?: boolean
}