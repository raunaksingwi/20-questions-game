export abstract class PromptTemplate {
  protected abstract getSpecificRules(secretItem: string): string
  protected abstract getSynonymsSection(secretItem: string): string
  protected abstract getExamples(secretItem: string): string
  protected abstract getCategoryDescription(): string

  generate(secretItem: string): string {
    return `You are the game master in 20 Questions. The secret item is: ${secretItem}

CRITICAL RULES:
${this.getCriticalRules()}

${this.getSpecificRules(secretItem)}

${this.getCriticalOutputFormat()}

${this.getSynonymsSection(secretItem)}

${this.getExamples(secretItem)}`
  }

  generateItemSelection(sampleItems: string[]): string {
    return `You are selecting a secret item for a 20 Questions game.

CATEGORY: ${this.getCategoryDescription()}

Examples of items in this category: ${sampleItems.join(', ')}

INSTRUCTIONS:
1. Choose ANY item that fits this category - not necessarily from the examples above
2. The examples show the type of items, but pick your own choice
3. Choose something interesting but not too obscure (players should be able to guess it eventually)
4. Respond with ONLY the item name, nothing else

Pick your item now:`
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

// Base class for all people-based categories (sports players, leaders, etc.)
export abstract class PeoplePromptTemplate extends PromptTemplate {
  protected abstract getPersonType(): string; // e.g., "cricketer", "football player", "world leader"
  protected abstract getExampleProperties(): string[]; // e.g., ["nationality", "position", "club"]
  protected abstract getExampleQuestions(): string[]; // e.g., ["Are they Indian?", "Do they bowl?"]

  protected getSpecificRules(secretItem: string): string {
    const personType = this.getPersonType();
    return `RESPONSE RULES:
1. If player asks about properties (${this.getExampleProperties().join(', ')}, etc): Return {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
2. If player guesses a WRONG ${personType} name: Return {"answer": "No"}  
3. If player guesses the CORRECT ${personType} (${secretItem}): Return {"answer": "Yes", "is_guess": true}`
  }

  protected getSynonymsSection(secretItem: string): string {
    return `SYNONYMS AND VARIATIONS:
Accept common variations of ${secretItem} as correct guesses:
- Full name: "${secretItem}" 
- First name only: If commonly used
- Last name only: If commonly used  
- Nicknames: Popular nicknames and abbreviations
- Alternate spellings: Common spelling variations`
  }

  protected getExamples(secretItem: string): string {
    const exampleQuestions = this.getExampleQuestions();
    return `Examples for ${secretItem}:
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common variations of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it [wrong name]?" → {"answer": "No"}
${exampleQuestions.map(q => `- "${q}" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}`).join('\n')}`
  }
}

export class CricketersPromptTemplate extends PeoplePromptTemplate {
  protected getCategoryDescription(): string {
    return "Professional cricket players from any era, country, or format (Test, ODI, T20)"
  }

  protected getPersonType(): string {
    return "cricketer"
  }

  protected getExampleProperties(): string[] {
    return ["nationality", "position", "bowling style", "batting style"]
  }

  protected getExampleQuestions(): string[] {
    return ["Are they Indian?", "Do they bowl?", "Are they a captain?"]
  }
}

export class AnimalsPromptTemplate extends PromptTemplate {
  protected getCategoryDescription(): string {
    return "Any living creature from the animal kingdom - mammals, birds, fish, reptiles, insects, etc."
  }

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

export class FootballPlayersPromptTemplate extends PeoplePromptTemplate {
  protected getCategoryDescription(): string {
    return "Professional football (soccer) players from any era, league, or country"
  }

  protected getPersonType(): string {
    return "football player"
  }

  protected getExampleProperties(): string[] {
    return ["nationality", "position", "club", "league"]
  }

  protected getExampleQuestions(): string[] {
    return ["Are they from Argentina?", "Do they play forward?", "Are they still active?"]
  }
}

export class NBAPlayersPromptTemplate extends PeoplePromptTemplate {
  protected getCategoryDescription(): string {
    return "Professional NBA basketball players from any era or team"
  }

  protected getPersonType(): string {
    return "NBA player"
  }

  protected getExampleProperties(): string[] {
    return ["position", "team", "nationality", "conference"]
  }

  protected getExampleQuestions(): string[] {
    return ["Do they play point guard?", "Are they over 30 years old?", "Are they still active?"]
  }
}

export class WorldLeadersPromptTemplate extends PeoplePromptTemplate {
  protected getCategoryDescription(): string {
    return "Current or recent world leaders - presidents, prime ministers, monarchs, etc."
  }

  protected getPersonType(): string {
    return "world leader"
  }

  protected getExampleProperties(): string[] {
    return ["country", "position", "political party", "continent"]
  }

  protected getExampleQuestions(): string[] {
    return ["Are they from Europe?", "Are they a president?", "Are they currently in office?"]
  }
}

export class ObjectsPromptTemplate extends PromptTemplate {
  protected getCategoryDescription(): string {
    return "Any physical object or item - tools, furniture, electronics, vehicles, household items, etc."
  }

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
  protected getCategoryDescription(): string {
    return "Any item, concept, or entity that fits the general category"
  }

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
      case 'cricket players':
        return new CricketersPromptTemplate()
      case 'animals':
        return new AnimalsPromptTemplate()
      case 'football players':
        return new FootballPlayersPromptTemplate()
      case 'nba players':
        return new NBAPlayersPromptTemplate()
      case 'world leaders':
        return new WorldLeadersPromptTemplate()
      case 'objects':
        return new ObjectsPromptTemplate()
      default:
        return new DefaultPromptTemplate()
    }
  }
}