import { GameLLMResponse } from './types.ts'

export class ResponseParser {
  static parseGameResponse(rawResponse: string): GameLLMResponse {
    // Try to extract JSON from the response
    let llmResponse: GameLLMResponse
    try {
      const jsonMatch = rawResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        llmResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (error) {
      // Fallback if LLM doesn't return proper JSON - extract just the answer portion
      let cleanAnswer = rawResponse.trim()
      let isGuess = false
      
      // Try to extract just the answer from responses like "No, eagle is not a reptile"
      if (cleanAnswer.toLowerCase().startsWith('yes')) {
        cleanAnswer = 'Yes'
        // Check if this might be a winning guess (LLM said Yes but didn't format properly)
        // Look for winning phrases in the raw response
        if (rawResponse.toLowerCase().includes('correct') || 
            rawResponse.toLowerCase().includes('you got it') ||
            rawResponse.toLowerCase().includes('that\'s right') ||
            rawResponse.toLowerCase().includes('exactly')) {
          isGuess = true
        }
      } else if (cleanAnswer.toLowerCase().startsWith('no')) {
        cleanAnswer = 'No'
      } else if (cleanAnswer.toLowerCase().startsWith('sometimes')) {
        cleanAnswer = 'Sometimes'
      } else if (cleanAnswer.toLowerCase().includes('not sure')) {
        cleanAnswer = 'Not sure'
      }
      
      llmResponse = {
        answer: cleanAnswer,
        is_guess: isGuess
      }
    }

    return llmResponse
  }

  static parseHintResponse(rawResponse: string): string {
    // Parse hint response in case LLM returns JSON format
    let hint: string
    try {
      // Try to extract JSON from the response (in case LLM adds JSON format)
      const jsonMatch = rawResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // If it's JSON, extract the answer or any text field
        hint = parsed.answer || parsed.hint || parsed.text || rawResponse;
      } else {
        hint = rawResponse;
      }
    } catch (error) {
      // If parsing fails, use the raw text
      hint = rawResponse;
    }

    // Clean up the hint text
    hint = hint.replace(/^(Hint:|Answer:)\s*/i, '').trim()
    
    return hint
  }

  static validateGameResponse(
    response: GameLLMResponse, 
    rawResponse: string, 
    question: string, 
    secretItem: string
  ): void {
    // Safety validation - log suspicious cases
    if (response.is_guess === true && !response.answer.toLowerCase().includes('yes')) {
      console.error('VALIDATION ERROR: is_guess=true but answer is not Yes:', {
        raw_response: rawResponse,
        parsed_response: response,
        question: question,
        secret_item: secretItem
      })
    }
  }
}