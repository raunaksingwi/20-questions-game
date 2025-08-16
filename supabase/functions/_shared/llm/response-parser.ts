/**
 * Response parser utility for processing LLM outputs.
 * Handles JSON extraction, answer cleaning, and response validation.
 */
import { GameLLMResponse } from './types.ts'

/**
 * Utility class for parsing and cleaning LLM responses.
 */
export class ResponseParser {
  /**
   * Parses raw LLM response into structured game response format.
   * Handles both JSON and plain text responses with fallback logic.
   */
  static parseGameResponse(rawResponse: string): GameLLMResponse {
    // Try to extract JSON from the response
    let llmResponse: GameLLMResponse
    try {
      const jsonMatch = rawResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        llmResponse = JSON.parse(jsonMatch[0]);
        // Clean the answer field to remove extra text
        llmResponse.answer = this.cleanAnswer(llmResponse.answer);
      } else {
        throw new Error('No JSON found');
      }
    } catch (error) {
      // Fallback if LLM doesn't return proper JSON
      const cleanAnswer = this.cleanAnswer(rawResponse.trim());
      let isGuess = false
      
      // Check if this might be a winning guess
      if (cleanAnswer === 'Yes' && (
        rawResponse.toLowerCase().includes('correct') || 
        rawResponse.toLowerCase().includes('you got it') ||
        rawResponse.toLowerCase().includes('that\'s right') ||
        rawResponse.toLowerCase().includes('exactly')
      )) {
        isGuess = true;
      }
      
      llmResponse = {
        answer: cleanAnswer,
        is_guess: isGuess
      }
    }

    // Final cleaning of the answer
    llmResponse.answer = this.cleanAnswer(llmResponse.answer);
    return llmResponse
  }

  /**
   * Cleans and normalizes answer text to standard Yes/No/Sometimes format.
   */
  private static cleanAnswer(answer: string): string {
    const cleaned = answer.trim();
    
    // Extract only the core answer from responses
    if (cleaned.toLowerCase().startsWith('yes')) {
      return 'Yes';
    } else if (cleaned.toLowerCase().startsWith('no')) {
      return 'No';
    } else if (cleaned.toLowerCase().startsWith('sometimes')) {
      return 'Sometimes';
    } else if (cleaned.toLowerCase().includes('not sure') || cleaned.toLowerCase().includes('unsure')) {
      return 'Not sure';
    }
    
    // Default fallback - try to extract first word if it's a valid response
    const firstWord = cleaned.split(/\s+/)[0].toLowerCase();
    if (['yes', 'no', 'sometimes'].includes(firstWord)) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }
    
    // If nothing matches, return the original but limit length
    return cleaned.substring(0, 50);
  }

  /**
   * Parses raw LLM response for hint generation.
   * Extracts hint text from JSON or returns plain text.
   */
  static parseHintResponse(rawResponse: string): string {
    let hint: string
    try {
      // Try to extract JSON from the response (in case LLM adds JSON format)
      const jsonMatch = rawResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        hint = parsed.answer || parsed.hint || parsed.text || rawResponse;
      } else {
        hint = rawResponse;
      }
    } catch (error) {
      hint = rawResponse;
    }

    // Clean up the hint text - remove common prefixes and extra formatting
    hint = hint
      .replace(/^(Hint:|Answer:|Here's a hint:|The hint is:)\s*/i, '')
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    // Limit hint length to prevent overly long responses
    if (hint.length > 200) {
      hint = hint.substring(0, 200).trim() + '...';
    }
    
    return hint;
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