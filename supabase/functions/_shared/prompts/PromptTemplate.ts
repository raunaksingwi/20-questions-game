export abstract class PromptTemplate {
  protected abstract getSpecificRules(secretItem: string): string
  protected abstract getSynonymsSection(secretItem: string): string
  protected abstract getExamples(secretItem: string): string

  generate(secretItem: string): string {
    return `You are the game master in 20 Questions. The secret item is: ${secretItem}

CRITICAL RULES:
${this.getCriticalRules()}

${this.getSpecificRules(secretItem)}

${this.getCriticalOutputFormat()}

${this.getSynonymsSection(secretItem)}

${this.getExamples(secretItem)}`
  }

  private getCriticalRules(): string {
    return `1. Only return JSON in the exact format specified
2. Never reveal the secret item in your responses
3. The "is_guess" field should ONLY be true when the player correctly guesses the secret item
4. MAINTAIN CONSISTENCY: Every answer must be consistent with all previous answers in the conversation
5. Track what you've revealed: Remember your previous responses to avoid contradictions
6. WEB SEARCH: Use web search when questions require current information, recent events, or facts that might have changed since your training data. Examples:
   - "Is it still in production?" (current status)
   - "Is it the current champion?" (recent results)
   - "Did it happen this year?" (current events)
   - Questions about recent statistics, prices, or availability`
  }

  private getCriticalOutputFormat(): string {
    return `CRITICAL OUTPUT FORMAT:
- NEVER add explanations, extra text, or commentary
- NEVER add "because...", "since...", or any reasoning
- Return ONLY the JSON object specified above
- NO additional words before or after the JSON

CRITICAL: When the player correctly guesses the secret item, you MUST include both "answer": "Yes" AND "is_guess": true in the same JSON response.

WRONG: {"answer": "Yes"} - Missing is_guess field
CORRECT: {"answer": "Yes", "is_guess": true"} - Has both fields`
  }
}

export class CricketersPromptTemplate extends PromptTemplate {
  protected getSpecificRules(secretItem: string): string {
    return `RESPONSE RULES:
1. If player asks about properties (nationality, position, etc): Return ONLY {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
2. If player guesses a WRONG cricketer name: Return ONLY {"answer": "No"}  
3. If player guesses the CORRECT cricketer (${secretItem}): Return ONLY {"answer": "Yes", "is_guess": true}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS AND VARIATIONS:
Accept common variations of ${secretItem} as correct guesses:
- Full name: "${secretItem}" 
- First name only: If commonly used (e.g., "Virat" for "Virat Kohli")
- Last name only: If commonly used (e.g., "Dhoni" for "MS Dhoni")  
- Nicknames: Popular nicknames (e.g., "Captain Cool" for MS Dhoni, "Hitman" for Rohit Sharma)
- Initials: Well-known initials (e.g., "ABD" for AB de Villiers, "MSD" for MS Dhoni)`
  }

  protected getExamples(secretItem: string): string {
    return `Examples for ${secretItem}:
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common variations of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it Virat Kohli?" (when secret is not Virat) → {"answer": "No"}
- "Are they Indian?" → {"answer": "Yes"} or {"answer": "No"}
- "Do they bowl?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}`
  }
}

export class AnimalsPromptTemplate extends PromptTemplate {
  protected getSpecificRules(secretItem: string): string {
    return `RESPONSE RULES:
1. If player asks about properties (classification, habitat, etc): Return {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
2. If player guesses a WRONG animal name: Return {"answer": "No"}  
3. If player guesses the CORRECT animal (${secretItem}): Return {"answer": "Yes", "is_guess": true}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS AND VARIATIONS:
Accept common synonyms of ${secretItem} as correct guesses:
- Main name: "${secretItem}"
- Common synonyms: (e.g., "dog/hound", "cat/feline", "snake/serpent")  
- Regional names: Different names for the same animal
- Scientific vs common names: Accept both if widely known`
  }

  protected getExamples(secretItem: string): string {
    return `Examples for ${secretItem}:
- "Is it a ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common synonyms of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it a cat?" (when secret is not cat) → {"answer": "No"}
- "Is it a mammal?" → {"answer": "Yes"} or {"answer": "No"}
- "Does it have fur?" → {"answer": "Yes"} or {"answer": "No"}
- "Can it fly?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}`
  }
}

export class FoodPromptTemplate extends PromptTemplate {
  protected getSpecificRules(secretItem: string): string {
    return `RESPONSE RULES:
1. If player asks about properties (category, preparation, etc): Return {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
2. If player guesses a WRONG food name: Return {"answer": "No"}  
3. If player guesses the CORRECT food (${secretItem}): Return {"answer": "Yes", "is_guess": true}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS AND VARIATIONS:
Accept common synonyms of ${secretItem} as correct guesses:
- Main name: "${secretItem}"
- Common synonyms: (e.g., "soda/pop", "fries/chips", "sub/hoagie")
- Regional variations: Different names for the same food
- Alternative spellings: Common spelling variations`
  }

  protected getExamples(secretItem: string): string {
    return `Examples for ${secretItem}:
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- "Is it a ${secretItem}?" → {"answer": "Yes", "is_guess": true}  
- Common synonyms of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it pasta?" (when secret is not pasta) → {"answer": "No"}
- "Is it a fruit?" → {"answer": "Yes"} or {"answer": "No"}
- "Is it served hot?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
- "Is it sweet?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}`
  }
}

export class ObjectsPromptTemplate extends PromptTemplate {
  protected getSpecificRules(secretItem: string): string {
    return `RESPONSE RULES:
1. If player asks about properties (function, materials, etc): Return {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
2. If player guesses a WRONG object name: Return {"answer": "No"}  
3. If player guesses the CORRECT object (${secretItem}): Return {"answer": "Yes", "is_guess": true}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS AND VARIATIONS:
Accept common synonyms of ${secretItem} as correct guesses:
- Main name: "${secretItem}"
- Common synonyms: (e.g., "couch/sofa", "car/automobile", "phone/telephone")
- Brand generics: Accept generic names for branded items (e.g., "phone" for "iPhone")
- Regional terms: Different names for the same object`
  }

  protected getExamples(secretItem: string): string {
    return `Examples for ${secretItem}:
- "Is it a ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common synonyms of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it a table?" (when secret is not table) → {"answer": "No"}
- "Is it furniture?" → {"answer": "Yes"} or {"answer": "No"}
- "Is it electronic?" → {"answer": "Yes"} or {"answer": "No"}
- "Can you hold it in your hand?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}`
  }
}

export class DefaultPromptTemplate extends PromptTemplate {
  protected getSpecificRules(secretItem: string): string {
    return `RESPONSE FORMAT:
- For questions about properties/attributes: {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
- For CORRECT guess of ${secretItem}: {"answer": "Yes", "is_guess": true}
- For WRONG guess of any other item: {"answer": "No"}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS: Accept common variations and synonyms of "${secretItem}" as correct guesses.`
  }

  protected getExamples(secretItem: string): string {
    return `- Return ONLY the JSON object: {"answer": "Yes/No/Sometimes"} or {"answer": "Yes", "is_guess": true}
- NEVER add explanations, extra text, or commentary
- NO additional words before or after the JSON`
  }
}

export class PromptTemplateFactory {
  static createTemplate(category: string): PromptTemplate {
    switch (category.toLowerCase()) {
      case 'cricketers':
        return new CricketersPromptTemplate()
      case 'animals':
        return new AnimalsPromptTemplate()
      case 'food':
        return new FoodPromptTemplate()
      case 'objects':
        return new ObjectsPromptTemplate()
      default:
        return new DefaultPromptTemplate()
    }
  }
}