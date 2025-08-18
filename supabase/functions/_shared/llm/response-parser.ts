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

    // Enhanced accuracy validation with contradiction detection
    const questionLower = question.toLowerCase()
    const hasTemporalWords = ['currently', 'still', 'now', 'recent', 'lately', 'nowadays', 'today'].some(word => 
      questionLower.includes(word)
    )
    const hasStatusWords = ['active', 'retired', 'playing', 'current', 'present', 'ongoing'].some(word => 
      questionLower.includes(word)
    )
    const hasSuperlatives = ['champion', 'winner', 'best', 'top', 'leading', 'fastest', 'largest', 'most', 'highest'].some(word => 
      questionLower.includes(word)
    )

    // Log if potentially fact-sensitive questions weren't searched
    if ((hasTemporalWords || hasStatusWords || hasSuperlatives) && !rawResponse.includes('SEARCH FUNCTION CALLED')) {
      console.warn('ACCURACY WARNING: Fact-sensitive question may need verification:', {
        question: question,
        answer: response.answer,
        temporal_words: hasTemporalWords,
        status_words: hasStatusWords,
        superlatives: hasSuperlatives,
        secret_item: secretItem
      })
    }

    // Detect potential accuracy corrections (when LLM might be correcting previous wrong info)
    const correctionIndicators = [
      'search function called',
      'verification',
      'current information',
      'updated',
      'latest',
      'recent data'
    ];
    
    const mightBeCorrection = correctionIndicators.some(indicator => 
      rawResponse.toLowerCase().includes(indicator)
    );
    
    if (mightBeCorrection) {
      console.info('ACCURACY INFO: Response may contain fact correction based on search:', {
        question: question,
        answer: response.answer,
        secret_item: secretItem,
        raw_response: rawResponse.substring(0, 200) + '...'
      })
    }

    // Validate answer format
    const validAnswers = ['Yes', 'No', 'Sometimes', 'Not sure']
    if (!validAnswers.includes(response.answer)) {
      console.warn('FORMAT WARNING: Non-standard answer format:', {
        answer: response.answer,
        question: question,
        raw_response: rawResponse
      })
    }

    // Flag questions that might reveal previous inaccuracies
    const factCheckTriggers = [
      'verify', 'confirm', 'check', 'sure', 'certain', 'correct',
      'real', 'actual', 'true', 'false', 'wrong', 'right'
    ];
    
    const mightRevealInaccuracy = factCheckTriggers.some(trigger => 
      questionLower.includes(trigger)
    );
    
    if (mightRevealInaccuracy) {
      console.info('FACT-CHECK OPPORTUNITY: Question might reveal accuracy of previous answers:', {
        question: question,
        answer: response.answer,
        secret_item: secretItem
      })
    }
  }
}