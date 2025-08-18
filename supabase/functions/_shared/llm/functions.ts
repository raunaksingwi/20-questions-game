import { LLMFunction } from './types.ts'
import { SearchService } from '../services/search.ts'

/**
 * Enhanced search function with category-specific optimization
 */
export function createContextualSearchFunction(category?: string, secretItem?: string): LLMFunction {
  let enhancedDescription = SEARCH_FUNCTION.description
  
  if (category && secretItem) {
    const categoryLower = category.toLowerCase()
    enhancedDescription += `\n\nCURRENT CONTEXT: You are answering questions about a ${category.toLowerCase()} (specifically: ${secretItem}).\n`
    
    switch (categoryLower) {
      case 'cricketers':
        enhancedDescription += `CRICKET-SPECIFIC SEARCHES:\n- Current team and status: "${secretItem} current team 2024"\n- Career stats: "${secretItem} cricket statistics"\n- Playing style: "${secretItem} batting bowling style"\n- Recent performance: "${secretItem} recent matches 2024"`
        break
      case 'animals':
        enhancedDescription += `ANIMAL-SPECIFIC SEARCHES:\n- Habitat and range: "${secretItem} habitat distribution"\n- Physical characteristics: "${secretItem} physical features size"\n- Behavior and diet: "${secretItem} behavior feeding habits"\n- Conservation status: "${secretItem} conservation status IUCN"`
        break
      case 'food':
        enhancedDescription += `FOOD-SPECIFIC SEARCHES:\n- Ingredients: "${secretItem} ingredients recipe"\n- Preparation: "${secretItem} cooking preparation method"\n- Origin and culture: "${secretItem} origin cultural significance"\n- Nutritional info: "${secretItem} nutritional facts calories"`
        break
      case 'objects':
        enhancedDescription += `OBJECT-SPECIFIC SEARCHES:\n- Materials and construction: "${secretItem} materials construction"\n- Function and usage: "${secretItem} purpose usage"\n- Current specifications: "${secretItem} 2024 specifications features"\n- Technical details: "${secretItem} technical specifications dimensions"`
        break
    }
  }
  
  return {
    ...SEARCH_FUNCTION,
    description: enhancedDescription
  }
}

export const SEARCH_FUNCTION: LLMFunction = {
  name: 'web_search',
  description: `Search the web for current, specific information when you need to verify facts or get detailed context. HIGHLY RECOMMENDED for:
  - Current sports statistics, player info, recent matches (for cricketers)
  - Recent scientific facts about animals (habitat, behavior, conservation status)
  - Current food preparation methods, ingredients, nutritional info
  - Modern objects, technology specs, current usage patterns
  - When unsure about specific properties or recent changes
  
  MANDATORY SEARCH TRIGGERS - Always search for questions containing:
  - Temporal words: "currently", "still", "now", "recent", "lately", "nowadays", "today"
  - Status words: "active", "retired", "playing", "current", "present", "ongoing"
  - Championship/ranking: "champion", "winner", "best", "top", "leading", "record holder"
  - Superlatives: "fastest", "largest", "most", "highest", "strongest", "biggest"
  - Possession: "has", "owns", "holds" (current records/titles)
  - Recent time references: "this year", "2024", "recently", "latest"
  
  WHEN TO USE:
  - Question asks about recent/current information ("Is he still active?", "Is it endangered?")
  - Question requires specific factual verification ("Does it live in X?", "Is it made of Y?")
  - You're uncertain about properties that could have changed recently
  - Question involves statistics, numbers, or measurable properties
  - ANY question with temporal/status/superlative indicators above
  
  SEARCH EXAMPLES:
  - "Virat Kohli current team 2024" - for cricket player questions
  - "Bengal tiger habitat conservation status" - for animal habitat questions  
  - "iPhone 15 materials construction" - for object material questions
  - "pizza ingredients preparation methods" - for food preparation questions`,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Specific search query to find relevant, current information. Be specific and include current year if relevant.'
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
      return JSON.stringify({ error: `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}` })
    }
  }
}