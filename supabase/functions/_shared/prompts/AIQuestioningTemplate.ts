export abstract class AIQuestioningTemplate {
  protected abstract getCategoryName(): string
  protected abstract getStrategicQuestions(): string[]
  protected abstract getQuestionProgression(): string
  protected abstract getExampleProgression(): string
  protected abstract getCategorySpecificDeductions(): string

  generate(questionsAsked: number, conversationHistory: string, alreadyAskedQuestions: string[]): string {
    const shouldGuess = this.shouldMakeSpecificGuess(questionsAsked, conversationHistory)
    
    return `You are playing 20 Questions in AI Guessing mode. The user has thought of an item within the category: ${this.getCategoryName()}.
Your job is to ask up to 20 yes/no questions to identify the item.

${this.getCoreRules()}

${this.getRepetitionPrevention(alreadyAskedQuestions)}

${this.getCategorySpecificDeductions()}

${this.getStructuredReasoningPrompt(questionsAsked, conversationHistory, alreadyAskedQuestions)}

${shouldGuess ? this.getGuessingGuidance(questionsAsked) : this.getStrategicGuidance()}

${this.getQuestionProgression()}

${this.getExampleProgression()}

Current question count: ${questionsAsked + 1} of 20.

${this.getOutputFormat()}

${conversationHistory}

${shouldGuess ? 'Based on the information gathered, make a specific guess about the exact item.' : 'Work through the structured reasoning steps above, then output only the next strategic yes/no question.'}`;
  }

  private shouldMakeSpecificGuess(questionsAsked: number, conversationHistory: string): boolean {
    // Allow flexible guessing based on confidence, not strict question limits
    const history = conversationHistory.toLowerCase()
    
    // Make guesses when you have enough information to be confident
    switch (this.getCategoryName().toLowerCase()) {
      case 'world leaders':
        return this.hasWorldLeaderGuessIndicators(history) || questionsAsked >= 12
      case 'animals':
        return this.hasAnimalGuessIndicators(history) || questionsAsked >= 12
      case 'objects':
        return this.hasObjectGuessIndicators(history) || questionsAsked >= 12
      default:
        return questionsAsked >= 12
    }
  }

  private hasWorldLeaderGuessIndicators(history: string): boolean {
    // If we know specific country + era + role, start guessing
    const hasCountry = history.includes('asia') || history.includes('europe') || history.includes('africa')
    const hasEra = history.includes('20th century') || history.includes('specific time')
    const hasRole = history.includes('head of government') || history.includes('president') || history.includes('prime minister')
    
    return hasCountry && hasEra && hasRole
  }

  private hasAnimalGuessIndicators(history: string): boolean {
    // If we know classification + habitat + size, start guessing
    const hasClassification = history.includes('mammal') || history.includes('bird') || history.includes('reptile')
    const hasHabitat = history.includes('wild') || history.includes('domestic') || history.includes('water')
    const hasSize = history.includes('large') || history.includes('small') || history.includes('four legs')
    
    return hasClassification && hasHabitat && hasSize
  }

  private hasObjectGuessIndicators(history: string): boolean {
    // If we know location + function + size, start guessing
    const hasLocation = history.includes('indoor') || history.includes('kitchen') || history.includes('portable')
    const hasFunction = history.includes('electronic') || history.includes('tool') || history.includes('furniture')
    const hasSize = history.includes('hold it') || history.includes('hand') || history.includes('book')
    
    return hasLocation && hasFunction && hasSize
  }

  private getGuessingGuidance(questionsAsked: number): string {
    return `🎯 GUESSING MODE ACTIVATED (Question ${questionsAsked + 1} of 20):
Based on the conversation so far, you should now make SPECIFIC GUESSES about the exact item.

GUESSING STRATEGY:
• Use the confirmed facts to identify the most likely candidates
• Ask "Is it [SPECIFIC ITEM]?" questions
• Choose the most probable items based on all confirmed characteristics
• Don't ask more general property questions - focus on specific identifications

IMPORTANT: Frame your guess as a yes/no question: "Is it [specific item name]?"`;
  }

  private getCoreRules(): string {
    return `CORE RULES:
- Ask one clear yes/no question that most people would know
- Each question should eliminate about half the possibilities
- Make educated guesses when you feel confident about the answer
- Stay within the category and build on previous answers

❌ AVOID THESE VAGUE QUESTIONS:
- "Does it have special characteristics?"
- "Does it have unique features?"
- "Is it from a specific region or time period?"
- "Does it have multiple forms or variations?"
- "Are there any notable aspects?"
- "Is it known for particular qualities?"

✅ ASK CONCRETE, SPECIFIC QUESTIONS:
- Binary properties that can be answered definitively
- Clear geographic or temporal distinctions  
- Specific roles, functions, or classifications
- Physical properties that are observable
- Historical facts that are well-known

CRITICAL: Every question must be CONCRETE and SPECIFIC, not vague or subjective!`
  }

  private getRepetitionPrevention(alreadyAskedQuestions: string[]): string {
    if (alreadyAskedQuestions.length === 0) return ''
    
    return `🚫 ALREADY ASKED QUESTIONS - DO NOT REPEAT THESE EXACT QUESTIONS:
${alreadyAskedQuestions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}
CRITICAL: You must ask a NEW question that has never been asked before!`
  }

  private getStrategicGuidance(): string {
    const questions = this.getStrategicQuestions()
    return `STRATEGIC QUESTION TYPES FOR ${this.getCategoryName().toUpperCase()} (ask these types, not exact duplicates):
${questions.map(q => `• ${q}`).join('\n')}`
  }

  private getStructuredReasoningPrompt(questionsAsked: number, conversationHistory: string, alreadyAskedQuestions: string[]): string {
    return `🧠 STRUCTURED REASONING - You MUST complete these steps before asking your question:

STEP 1: DOMAIN ANALYSIS
- Based on all confirmed YES/NO answers, what specific sub-domain am I working within?
- Example: If confirmed "electronic + portable + daily use" → I'm in "portable electronics" domain
- What broader categories have I already eliminated?

STEP 2: REMAINING POSSIBILITIES ANALYSIS  
- Given ALL confirmed facts, list 3-5 specific items that could still match
- Example: If "object + electronic + handheld + charges things" → charging cable, power bank, USB cable, etc.
- How many possibilities roughly remain?

STEP 3: OPTIMAL ELIMINATION STRATEGY
- Which single property would best split remaining possibilities in half?
- What concrete, specific question eliminates ~50% while being answerable?
- Avoid asking about properties that are logical consequences of confirmed facts

STEP 4: REPETITION & REDUNDANCY CHECK
- Have I asked anything semantically similar to my proposed question?
- Am I asking about something I can deduce from existing answers?
- Is this question fundamentally different from all previous questions?

STEP 5: QUESTION VALIDATION
- Is my question concrete and specific (not vague like "unique characteristics")?
- Can most people answer this definitively with yes/no?
- Does this add meaningful new information?

FORMAT: Work through steps 1-4 in your thinking, then output ONLY the final question.

CRITICAL INSTRUCTION: If you cannot think of a good question that passes all checks, ask a very specific guess: "Is it [specific item name]?"`
  }

  private getOutputFormat(): string {
    return `OUTPUT FORMAT REQUIREMENTS:
- Work through the structured reasoning steps above first
- Then output ONLY the bare question text as a single line ending with a question mark  
- Do NOT include numbering, prefixes, explanations, qualifiers, or any other text
- Do NOT guess specific items too early; follow the strategic progression above`
  }
}

export class AnimalsAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Animals'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Is it a mammal?',
      'Is it a wild animal?', 
      'Is it larger than a dog?',
      'Is it a common pet?',
      'Does it live in Africa?',
      'Does it eat meat?'
    ]
  }

  protected getQuestionProgression(): string {
    return `Start broad, then narrow: Classification → Habitat → Size → Diet → Guess`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Wild → Mammal → Large → Carnivore → African → Lion`
  }

  protected getCategorySpecificDeductions(): string {
    return `ANIMALS CATEGORY - LOGICAL DEDUCTIONS:
• If "mammal" = YES → It's NOT a bird, reptile, fish, or insect
• If "mammal" = NO → It could be a bird, reptile, fish, or insect  
• If "wild" = YES → It's NOT a domestic pet, lives in natural habitats
• If "wild" = NO → It could be a pet or farm animal
• If "carnivore" = YES → It eats meat, has predatory behavior
• If "herbivore" = YES → It's NOT a carnivore, eats plants only
• If "large" = YES → It's bigger than most household pets
• If "small" = YES → It's NOT large animals like elephants or whales`
  }
}

export class ObjectsAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Objects'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Can you hold it in one hand?',
      'Is it electronic?',
      'Is it found in a kitchen?', 
      'Is it made of metal?',
      'Do most people use it daily?',
      'Is it portable?'
    ]
  }

  protected getQuestionProgression(): string {
    return `Start broad, then narrow: Size → Function → Location → Material → Guess`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Indoor → Electronic → Portable → Communication → Phone`
  }

  protected getCategorySpecificDeductions(): string {
    return `OBJECTS CATEGORY - LOGICAL DEDUCTIONS:
• If "electronic" = YES → It's NOT living, NOT organic, NOT edible, requires power
• If "electronic" = NO → It doesn't require electricity, NOT a digital device
• If "handheld" = YES → It's portable/small, NOT furniture or large objects  
• If "handheld" = NO → It's large/heavy, you cannot carry it easily
• If "furniture" = YES → It's NOT handheld, likely found indoors
• If "tool" = YES → It has a specific function, designed for tasks
• If "kitchen" = YES → It's related to food/cooking, found in homes`
  }
}

export class WorldLeadersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'World Leaders'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Life Status: "Are they still alive?" (eliminates historical vs current)',
      'Continent: "Are they from Europe?", "Are they from Asia?", "Are they from Africa?"',
      'Country: "Are they from the United States?", "Are they from a major power?"',
      'Role: "Were they a president?", "Were they a prime minister?", "Were they a monarch?"',
      'Era: "Did they serve before 1990?", "Were they active in the 2000s?", "Did they serve in the 20th century?"',
      'Gender: "Are they male?" (eliminates roughly half)',
      'Duration: "Did they serve more than 8 years?", "Were they in power for decades?"',
      'Conflict: "Did they lead during a major war?", "Were they involved in World War II?"',
      'Democracy: "Were they democratically elected?", "Did they come to power through revolution?"',
      'Fame: "Are they considered one of the most famous leaders?", "Did they win a Nobel Peace Prize?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Life Status: "Are they still alive?" (huge elimination)
2. Continent: "Are they from Europe/Asia/Africa?" (geographic narrowing)
3. Era: "Did they serve before 1990?" (time period split)  
4. Role: "Were they a president/prime minister?" (position type)
5. Country: "Are they from [specific major country]?" (nation identification)
6. Then make specific guesses

AVOID VAGUE QUESTIONS:
❌ "Is it from a specific region or time period?" 
✅ "Are they from Asia?" + "Did they serve before 1990?"

❌ "Does the world leader have multiple forms?"
✅ "Were they both a military and political leader?"`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Dead → European → Before 1990 → Prime Minister → Britain → Winston Churchill`
  }

  protected getCategorySpecificDeductions(): string {
    return `WORLD LEADERS CATEGORY - LOGICAL DEDUCTIONS:
• If "alive" = YES → They are currently serving or recently served, NOT historical figures
• If "alive" = NO → They are historical figures, NOT currently in office
• If "male" = YES → They are NOT female
• If "male" = NO → They are NOT male (female leaders)
• If "president" = YES → They held presidential office, NOT monarchs or PMs
• If "Europe" = YES → They are NOT from Asia, Africa, Americas, or Oceania
• If "before 1990" = YES → They are historical leaders, likely deceased
• If "democratically elected" = YES → They came to power through elections, NOT coups/inheritance`
  }
}

export class CricketPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Cricket Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity: "Are they currently active?" (eliminates retired players)',
      'Country: "Are they from India?" "Are they from Australia?" "Are they from England?"',
      'Role: "Are they a batsman?" "Are they a bowler?" "Are they a wicket-keeper?"',
      'Era: "Did they play before 2010?" "Are they from the 1990s-2000s era?"',
      'Achievement: "Have they captained their country?" "Are they a top-tier player?"',
      'Format: "Are they known for Test cricket?" "Do they play T20 leagues?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)
2. Country: "Are they from India?" (nationality narrowing)
3. Role: "Are they a batsman?" (playing position)
4. Era: "Did they play before 2010?" (generation split)
5. Achievement: "Have they captained their country?" (status level)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Active → Indian → Batsman → Captain → Top scorer → Virat Kohli`
  }

  protected getCategorySpecificDeductions(): string {
    return `CRICKET PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, historical figures
• If "Indian" = YES → They are NOT from Australia, England, or other countries
• If "batsman" = YES → They are NOT primarily bowlers or wicket-keepers
• If "captain" = YES → They have leadership experience, likely senior players
• If "before 2010" = YES → They are from earlier cricket eras`
  }
}

export class FootballPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Football Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity: "Are they currently active?" (eliminates retired players)',
      'Position: "Are they a quarterback?" "Are they on offense?" "Are they on defense?"',
      'Achievement: "Have they won a Super Bowl?" "Are they a Hall of Famer?"',
      'Team: "Have they played for the Patriots?" "Are they AFC?" "Are they NFC?"',
      'Era: "Did they play before 2010?" "Are they from the 2000s era?"',
      'Style: "Are they primarily known for passing?" "Are they known for running?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)
2. Position: "Are they a quarterback?" (position split)
3. Achievement: "Have they won a Super Bowl?" (success level)
4. Conference: "Are they AFC?" (league narrowing)
5. Era: "Did they play before 2010?" (generation)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Retired → QB → Multiple Super Bowls → AFC → Patriots → Tom Brady`
  }

  protected getCategorySpecificDeductions(): string {
    return `FOOTBALL PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, possibly Hall of Famers
• If "quarterback" = YES → They are NOT defensive players or other positions
• If "Super Bowl" = YES → They are successful, accomplished players
• If "AFC" = YES → They are NOT from NFC teams
• If "offense" = YES → They are NOT defensive players`
  }
}

export class NBAPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'NBA Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity: "Are they currently active?" (eliminates retired players)',
      'Position: "Are they a guard?" "Are they a center?" "Are they a forward?"',
      'Achievement: "Have they won an NBA championship?" "Are they a MVP winner?"',
      'Team: "Have they played for the Lakers?" "Are they Western Conference?"',
      'Era: "Did they play before 2000?" "Are they from the 1990s-2000s era?"',
      'Style: "Are they known for scoring?" "Are they known for assists?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)
2. Position: "Are they a guard?" (position split)
3. Achievement: "Have they won an NBA championship?" (success level)
4. Conference: "Are they Western Conference?" (league narrowing)
5. Era: "Did they play before 2000?" (generation)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Retired → Guard → Championships → Western → Lakers → Kobe Bryant`
  }

  protected getCategorySpecificDeductions(): string {
    return `NBA PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, possibly legends
• If "guard" = YES → They are NOT centers or forwards
• If "champion" = YES → They have won NBA titles, accomplished players
• If "Western" = YES → They are NOT from Eastern Conference teams
• If "Lakers" = YES → They have played for this specific franchise`
  }
}

export class DefaultAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'General Category'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Start broad, then narrow: Category properties → Specific attributes → Individual characteristics',
      'Ask binary questions that eliminate ~50% of possibilities',
      'Build on previous answers logically',
      'Avoid vague questions like "unique characteristics"'
    ]
  }

  protected getQuestionProgression(): string {
    return `QUESTIONING PROGRESSION:
1. Start with broad categorical distinctions
2. Narrow by key properties
3. Focus on specific characteristics
4. Make educated guesses when possibilities are limited`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Broad Category → Key Property → Specific Trait → Final Guess`
  }

  protected getCategorySpecificDeductions(): string {
    return `GENERAL CATEGORY - LOGICAL DEDUCTIONS:
• If "living" = YES → It's NOT inanimate objects, NOT electronic devices
• If "living" = NO → It's NOT biological, likely man-made or natural non-living
• If "man-made" = YES → It's NOT natural objects, designed by humans
• If "large" = YES → It's NOT small portable items
• Apply logical elimination based on confirmed properties`
  }
}

export class AIQuestioningTemplateFactory {
  static createTemplate(category: string): AIQuestioningTemplate {
    switch (category.toLowerCase()) {
      case 'animals':
        return new AnimalsAIQuestioningTemplate()
      case 'objects':
        return new ObjectsAIQuestioningTemplate()
      case 'world leaders':
        return new WorldLeadersAIQuestioningTemplate()
      case 'cricket players':
        return new CricketPlayersAIQuestioningTemplate()
      case 'football players':
        return new FootballPlayersAIQuestioningTemplate()
      case 'nba players':
        return new NBAPlayersAIQuestioningTemplate()
      default:
        return new DefaultAIQuestioningTemplate()
    }
  }
}