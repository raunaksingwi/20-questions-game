import { LLMFunction } from './types.ts'
import { SearchService } from '../services/search.ts'

export const SEARCH_FUNCTION: LLMFunction = {
  name: 'web_search',
  description: 'Search the web for current information when you need recent data, facts, or context that might not be in your training data. Use this for questions about recent events, current statistics, or when you need to verify information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant information'
      }
    },
    required: ['query']
  }
}

export class FunctionHandler {
  static async executeFunction(name: string, args: string): Promise<string> {
    try {
      const parsedArgs = JSON.parse(args)
      
      switch (name) {
        case 'web_search':
          const searchResult = await SearchService.search(parsedArgs.query)
          return JSON.stringify({
            searchTerm: searchResult.searchTerm,
            results: searchResult.results.slice(0, 3).map(r => ({
              title: r.title,
              snippet: r.snippet
            }))
          })
        
        default:
          throw new Error(`Unknown function: ${name}`)
      }
    } catch (error) {
      console.error(`Function execution error for ${name}:`, error)
      return JSON.stringify({ error: `Failed to execute ${name}: ${error.message}` })
    }
  }
}