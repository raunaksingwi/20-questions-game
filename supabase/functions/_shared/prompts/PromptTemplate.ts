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
    return `CORE RULES:
1. Return ONLY JSON: {"answer": "Yes/No/Sometimes", "is_guess": true/false}
2. Never reveal the secret item
3. Answer factual questions with definitive Yes or No based on your knowledge
4. Only use "Sometimes" for genuinely variable properties (like color, size)
5. When player guesses correctly: {"answer": "Yes", "is_guess": true}

EXAMPLES:
- "Is a penguin a bird?" → {"answer": "Yes"} (factual)
- "Is Nelson Mandela alive?" → {"answer": "No"} (factual)
- "Is a chair made of wood?" → {"answer": "Sometimes"} (variable)`
  }

  private getCriticalOutputFormat(): string {
    return `OUTPUT FORMAT:
Return ONLY JSON: {"answer": "Yes/No/Sometimes", "is_guess": true/false}

Examples:
- Property question: {"answer": "Yes"}
- Correct guess: {"answer": "Yes", "is_guess": true}
- Wrong guess: {"answer": "No"}`
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
    const personType = this.getPersonType();
    return `FACTUAL ACCURACY EXAMPLES for ${secretItem}:

GUESSING EXAMPLES:
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common variations of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it [wrong name]?" → {"answer": "No"}

PROPERTY EXAMPLES (must be factually correct):
${exampleQuestions.map(q => `- "${q}" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"} based on ACTUAL facts`).join('\n')}

BIOGRAPHICAL EXAMPLES (must be factually correct):
- "Are they alive?" → {"answer": "Yes"} (if living) or {"answer": "No"} (if deceased)
- "Are they male?" → {"answer": "Yes"} or {"answer": "No"} based on actual gender
- "Are they over 30?" → Based on actual age/birth year
- "Are they retired?" → {"answer": "Yes"}, {"answer": "No"}, or {"answer": "Sometimes"}

GEOGRAPHIC EXAMPLES (must be factually correct):
- "Are they from [country]?" → Based on actual nationality/birth country
- "Do they play/work in [location]?" → Based on current or recent location

TEMPORAL EXAMPLES (use web search if uncertain):
- "Are they currently active?" → Use search for current status
- "Are they still playing?" → Use search for recent activity
- "Are they the current [title]?" → Use search for up-to-date information

CRITICAL: Every answer must be factually accurate for ${secretItem}!
If uncertain about any fact, use web search to verify before answering.`
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
    return `FACTUAL ACCURACY EXAMPLES for ${secretItem}:

GUESSING EXAMPLES:
- "Is it a ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common synonyms of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it a cat?" (when secret is not cat) → {"answer": "No"}

CLASSIFICATION EXAMPLES (must be factually correct):
- "Is it a mammal?" → {"answer": "Yes"} (if secretItem is mammal) or {"answer": "No"} (if not)
- "Is it a bird?" → {"answer": "Yes"} (if secretItem is bird) or {"answer": "No"} (if not)
- "Is it a carnivore?" → {"answer": "Yes"} (if meat-eater) or {"answer": "No"} (if not)
- "Is it extinct?" → {"answer": "Yes"} (if extinct) or {"answer": "No"} (if still exists)

PHYSICAL PROPERTY EXAMPLES (must be factually correct):
- "Does it have fur?" → {"answer": "Yes"} or {"answer": "No"} based on actual biology
- "Can it fly?" → {"answer": "Yes"} (if can fly) or {"answer": "No"} (if cannot fly)
- "Does it have legs?" → {"answer": "Yes"} or {"answer": "No"} based on anatomy
- "Is it large?" → {"answer": "Sometimes"} (when size varies or is subjective)

HABITAT EXAMPLES (must be factually correct):
- "Does it live in water?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}
- "Does it live in Africa?" → Based on actual geographic distribution
- "Is it found in the wild?" → {"answer": "Yes"} or {"answer": "No"} or {"answer": "Sometimes"}

CRITICAL: Every answer must be factually accurate for the specific animal!`
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
    return `FACTUAL ACCURACY EXAMPLES for ${secretItem}:

GUESSING EXAMPLES:
- "Is it a ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- "Is it ${secretItem}?" → {"answer": "Yes", "is_guess": true}
- Common synonyms of ${secretItem} → {"answer": "Yes", "is_guess": true}
- "Is it a table?" (when secret is not table) → {"answer": "No"}

CLASSIFICATION EXAMPLES (must be factually correct):
- "Is it furniture?" → {"answer": "Yes"} (if actually furniture) or {"answer": "No"} (if not)
- "Is it electronic?" → {"answer": "Yes"} (if has electronics) or {"answer": "No"} (if not)
- "Is it a tool?" → {"answer": "Yes"} or {"answer": "No"} based on actual function
- "Is it alive?" → {"answer": "No"} (objects are not living organisms)

PHYSICAL PROPERTY EXAMPLES (must be factually correct):
- "Can you hold it in your hand?" → Based on actual size and weight
- "Is it made of wood?" → {"answer": "Yes"}, {"answer": "No"}, or {"answer": "Sometimes"}
- "Is it made of metal?" → Based on actual material composition
- "Does it have legs?" → {"answer": "Yes"} or {"answer": "No"} based on design
- "Is it red?" → {"answer": "Sometimes"} (varies by model/type) or specific color

FUNCTIONAL EXAMPLES (must be factually correct):
- "Is it used for sitting?" → {"answer": "Yes"} (chairs) or {"answer": "No"} (non-seating)
- "Does it need electricity?" → Based on actual power requirements
- "Can it break?" → {"answer": "Yes"} (most objects) or {"answer": "Sometimes"}
- "Is it waterproof?" → Based on actual design specifications

CRITICAL: Every answer must be factually accurate for the specific object!`
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