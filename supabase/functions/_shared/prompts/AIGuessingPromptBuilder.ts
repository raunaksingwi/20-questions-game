export interface FactsByAnswer {
  yesFacts: Array<{ n: number, q: string }>
  noFacts: Array<{ n: number, q: string }>
  maybeFacts: Array<{ n: number, q: string }>
  unknownFacts: Array<{ n: number, q: string }>
}

export interface GameMessage {
  role: string
  content: string
  question_number: number
}

export class AIGuessingPromptBuilder {
  
  /**
   * Categorizes conversation facts by answer type
   */
  static categorizeFacts(
    questionsByNumber: Record<number, string>,
    answersByNumber: Record<number, string>
  ): FactsByAnswer {
    const normalize = (s: string) => s.toLowerCase().trim()
    const isAffirmativeAnswer = (s: string) => {
      const n = normalize(s)
      return n.startsWith('y') || n === 'yes' || n.includes('yeah') || n.includes('yep')
    }
    const isNegativeAnswer = (s: string) => {
      const n = normalize(s)
      return n.startsWith('n') || n === 'no' || n.includes('nope')
    }
    const isDontKnowAnswer = (s: string) => {
      const n = normalize(s)
      return n.includes("don't know") || n.includes('dont know') || n.includes('unknown')
    }
    const isMaybeAnswer = (s: string) => {
      const n = normalize(s)
      return n.includes('maybe') || n.includes('sometimes') || n.includes('it depends')
    }

    const yesFacts: Array<{ n: number, q: string }> = []
    const noFacts: Array<{ n: number, q: string }> = []
    const maybeFacts: Array<{ n: number, q: string }> = []
    const unknownFacts: Array<{ n: number, q: string }> = []

    Object.keys(questionsByNumber)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .forEach(n => {
        const q = questionsByNumber[n]
        const a = answersByNumber[n]
        if (!q || !a) return
        if (isAffirmativeAnswer(a)) {
          yesFacts.push({ n, q })
        } else if (isNegativeAnswer(a)) {
          noFacts.push({ n, q })
        } else if (isMaybeAnswer(a)) {
          maybeFacts.push({ n, q })
        } else if (isDontKnowAnswer(a)) {
          unknownFacts.push({ n, q })
        }
      })

    return { yesFacts, noFacts, maybeFacts, unknownFacts }
  }

  /**
   * Builds categorized summary section
   */
  static buildCategorizedSummary(facts: FactsByAnswer): string {
    let categorizedSummary = 'ESTABLISHED FACTS - Use these to avoid redundant questions:\n'
    
    if (facts.yesFacts.length > 0) {
      categorizedSummary += '\n✓ CONFIRMED TRUE (YES answers):\n'
      facts.yesFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    if (facts.noFacts.length > 0) {
      categorizedSummary += '\n✗ CONFIRMED FALSE (NO answers):\n'
      facts.noFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    if (facts.maybeFacts.length > 0) {
      categorizedSummary += '\n~ PARTIAL YES (Sometimes/Maybe answers - treat as weak confirmations):\n'
      facts.maybeFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }
    
    if (facts.unknownFacts.length > 0) {
      categorizedSummary += '\n? UNKNOWN (Don\'t know answers):\n'
      facts.unknownFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
    }

    return categorizedSummary
  }

  /**
   * Builds logical deductions section for a specific category
   */
  static buildLogicalDeductions(category: string, facts: FactsByAnswer): string {
    if (facts.yesFacts.length === 0 && facts.noFacts.length === 0 && facts.maybeFacts.length === 0) {
      return ''
    }

    let deductions = '\n💡 LOGICAL DEDUCTIONS - You already know these facts (DO NOT ask about them):\n'
    
    switch (category.toLowerCase()) {
      case 'objects':
        deductions += this.buildObjectsDeductions(facts)
        break
      case 'world leaders':
        deductions += this.buildWorldLeadersDeductions(facts)
        break
      case 'animals':
        deductions += this.buildAnimalsDeductions(facts)
        break
      case 'cricket players':
      case 'football players':
      case 'nba players':
        deductions += this.buildSportsPlayersDeductions(facts)
        break
      default:
        deductions += this.buildGeneralDeductions(facts)
    }

    return deductions
  }

  private static buildObjectsDeductions(facts: FactsByAnswer): string {
    let deductions = ''
    const hasElectronic = facts.yesFacts.some(f => f.q.includes('electronic')) || facts.maybeFacts.some(f => f.q.includes('electronic'))
    const notElectronic = facts.noFacts.some(f => f.q.includes('electronic'))
    const hasHandheld = facts.yesFacts.some(f => f.q.includes('hold') || f.q.includes('hand')) || facts.maybeFacts.some(f => f.q.includes('hold') || f.q.includes('hand'))
    const notHandheld = facts.noFacts.some(f => f.q.includes('hold') || f.q.includes('hand'))
    
    if (hasElectronic) {
      deductions += '  → It is NOT living, NOT organic, NOT edible\n'
      deductions += '  → It requires power/electricity\n'
      deductions += '  → It is man-made\n'
    }
    if (notElectronic) {
      deductions += '  → It does NOT require electricity\n'
      deductions += '  → It is NOT a digital device\n'
    }
    if (hasHandheld) {
      deductions += '  → It is portable/small\n'
      deductions += '  → It is NOT furniture or large objects\n'
    }
    if (notHandheld) {
      deductions += '  → It is large/heavy\n'
      deductions += '  → You cannot carry it easily\n'
    }

    return deductions
  }

  private static buildWorldLeadersDeductions(facts: FactsByAnswer): string {
    let deductions = ''
    const isAlive = facts.yesFacts.some(f => f.q.includes('alive')) || facts.maybeFacts.some(f => f.q.includes('alive'))
    const isDead = facts.noFacts.some(f => f.q.includes('alive')) || facts.yesFacts.some(f => f.q.includes('dead')) || facts.maybeFacts.some(f => f.q.includes('dead'))
    const isMale = facts.yesFacts.some(f => f.q.includes('male')) || facts.maybeFacts.some(f => f.q.includes('male'))
    const isFemale = facts.noFacts.some(f => f.q.includes('male'))
    
    if (isAlive) {
      deductions += '  → They are currently serving or recently served\n'
      deductions += '  → They are NOT historical figures\n'
    }
    if (isDead) {
      deductions += '  → They are historical figures\n'
      deductions += '  → They are NOT currently in office\n'
    }
    if (isMale) {
      deductions += '  → They are NOT female\n'
    }
    if (isFemale) {
      deductions += '  → They are NOT male\n'
    }

    return deductions
  }

  private static buildAnimalsDeductions(facts: FactsByAnswer): string {
    let deductions = ''
    const isMammal = facts.yesFacts.some(f => f.q.includes('mammal')) || facts.maybeFacts.some(f => f.q.includes('mammal'))
    const notMammal = facts.noFacts.some(f => f.q.includes('mammal'))
    const isWild = facts.yesFacts.some(f => f.q.includes('wild')) || facts.maybeFacts.some(f => f.q.includes('wild'))
    const notWild = facts.noFacts.some(f => f.q.includes('wild'))
    
    if (isMammal) {
      deductions += '  → It is NOT a bird, reptile, fish, or insect\n'
      deductions += '  → It has fur/hair and warm blood\n'
    }
    if (notMammal) {
      deductions += '  → It could be a bird, reptile, fish, or insect\n'
    }
    if (isWild) {
      deductions += '  → It is NOT a domestic pet\n'
      deductions += '  → It lives in natural habitats\n'
    }
    if (notWild) {
      deductions += '  → It could be a pet or farm animal\n'
    }

    return deductions
  }

  private static buildSportsPlayersDeductions(facts: FactsByAnswer): string {
    let deductions = ''
    const isActive = facts.yesFacts.some(f => f.q.includes('active') || f.q.includes('current')) || facts.maybeFacts.some(f => f.q.includes('active') || f.q.includes('current'))
    const isRetired = facts.noFacts.some(f => f.q.includes('active') || f.q.includes('current'))
    const isMale = facts.yesFacts.some(f => f.q.includes('male')) || facts.maybeFacts.some(f => f.q.includes('male'))
    const isFemale = facts.noFacts.some(f => f.q.includes('male'))
    
    if (isActive) {
      deductions += '  → They are currently playing professionally\n'
      deductions += '  → They are NOT retired\n'
    }
    if (isRetired) {
      deductions += '  → They are no longer actively playing\n'
      deductions += '  → They are historical players\n'
    }
    if (isMale) {
      deductions += '  → They are NOT female\n'
    }
    if (isFemale) {
      deductions += '  → They are NOT male\n'
    }

    return deductions
  }

  private static buildGeneralDeductions(facts: FactsByAnswer): string {
    let deductions = ''
    const isLiving = facts.yesFacts.some(f => f.q.includes('living') || f.q.includes('alive'))
    const notLiving = facts.noFacts.some(f => f.q.includes('living') || f.q.includes('alive'))
    
    if (isLiving) {
      deductions += '  → It is NOT inanimate objects\n'
      deductions += '  → It is NOT electronic devices\n'
    }
    if (notLiving) {
      deductions += '  → It is NOT biological\n'
      deductions += '  → It is likely man-made or natural non-living\n'
    }

    return deductions
  }

  /**
   * Builds repetition prevention section with semantic similarity detection
   */
  static buildRepetitionPrevention(allAskedQuestions: string[]): string {
    if (allAskedQuestions.length === 0) return ''
    
    let section = '\n🚫 ALREADY ASKED QUESTIONS - DO NOT REPEAT THESE OR SEMANTICALLY SIMILAR QUESTIONS:\n'
    allAskedQuestions.forEach((q, index) => {
      section += `  ${index + 1}. ${q}\n`
    })
    
    // Add semantic categories that have been explored
    const semanticCategories = this.extractSemanticCategories(allAskedQuestions)
    if (semanticCategories.length > 0) {
      section += '\n⚠️  SEMANTIC CATEGORIES ALREADY EXPLORED - AVOID ASKING ABOUT:\n'
      semanticCategories.forEach(category => {
        section += `  → ${category}\n`
      })
    }
    
    section += '\nCRITICAL: You must ask a NEW question that is completely different from all questions above!\n'
    section += 'Do NOT ask variations of the same question (e.g., "Is it big?" vs "Is it large?").\n'
    section += 'Do NOT ask about the same topic using different words.\n'

    return section
  }

  /**
   * Extracts semantic categories that have already been explored
   */
  private static extractSemanticCategories(questions: string[]): string[] {
    const categories: string[] = []
    const lowerQuestions = questions.map(q => q.toLowerCase())
    
    const semanticGroups = [
      { category: 'Size/Scale (big, small, large, tiny, huge)', keywords: ['size', 'big', 'large', 'small', 'tiny', 'huge', 'massive', 'enormous', 'gigantic'] },
      { category: 'Life Status (alive, dead, living)', keywords: ['alive', 'living', 'life', 'dead', 'deceased', 'extinct'] },
      { category: 'Gender (male, female)', keywords: ['male', 'female', 'man', 'woman', 'gender', 'boy', 'girl'] },
      { category: 'Geography/Location (country, region)', keywords: ['country', 'nation', 'nationality', 'from', 'region', 'area', 'place', 'location', 'where', 'continent', 'europe', 'asia', 'africa', 'america'] },
      { category: 'Leadership Roles (president, minister, leader)', keywords: ['president', 'leader', 'prime minister', 'head', 'ruler', 'king', 'queen', 'monarch', 'dictator', 'emperor'] },
      { category: 'Time/Era (century, decade, period)', keywords: ['time', 'era', 'period', 'century', 'decade', 'when', 'before', 'after', 'during', 'recent', 'historical'] },
      { category: 'Color/Appearance', keywords: ['color', 'coloured', 'colored', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'appearance', 'looks'] },
      { category: 'Technology/Electronics', keywords: ['electronic', 'digital', 'technology', 'tech', 'computer', 'machine', 'device', 'gadget'] },
      { category: 'Animal Classification', keywords: ['mammal', 'animal', 'creature', 'species', 'bird', 'reptile', 'fish', 'insect'] },
      { category: 'Food/Diet', keywords: ['food', 'eat', 'edible', 'consume', 'diet', 'carnivore', 'herbivore', 'omnivore'] },
      { category: 'Home/Domestic', keywords: ['house', 'home', 'domestic', 'household', 'indoor', 'kitchen', 'bedroom', 'bathroom'] },
      { category: 'Material/Composition', keywords: ['material', 'made', 'metal', 'wood', 'plastic', 'glass', 'fabric', 'stone'] },
      { category: 'Function/Use', keywords: ['use', 'function', 'purpose', 'tool', 'instrument', 'equipment', 'work'] },
      { category: 'Activity Status (active, retired)', keywords: ['active', 'current', 'retired', 'former', 'still', 'playing', 'serving'] },
      { category: 'Achievement/Success', keywords: ['won', 'champion', 'award', 'prize', 'famous', 'successful', 'achievement', 'accomplished'] }
    ]
    
    for (const group of semanticGroups) {
      const hasKeyword = group.keywords.some(keyword => 
        lowerQuestions.some(q => q.includes(keyword))
      )
      if (hasKeyword) {
        categories.push(group.category)
      }
    }
    
    return categories
  }

  /**
   * Builds redundancy check section
   */
  static buildRedundancyCheck(facts: FactsByAnswer): string {
    if (facts.yesFacts.length < 2) return ''
    
    return '\n⚠️  REDUNDANCY CHECK: The item already has ALL of these properties confirmed as TRUE.\n' +
           'Do NOT ask about combinations of these confirmed properties.\n'
  }

  /**
   * Builds special response handling section
   */
  static buildSpecialResponseHandling(facts: FactsByAnswer, currentQuestionNumber: number): string {
    let section = ''
    
    const hasRecentUncertain = facts.unknownFacts.some(fact => 
      fact.n === currentQuestionNumber || fact.n === currentQuestionNumber - 1
    )
    
    const hasRecentMaybe = facts.maybeFacts.some(fact => 
      fact.n === currentQuestionNumber || fact.n === currentQuestionNumber - 1
    )
    
    if (hasRecentUncertain) {
      section += '\n⚠️  UNKNOWN RESPONSE DETECTED:\n'
      section += 'The user just gave a "Don\'t know" answer - they lack information about this topic.\n'
      section += 'STRATEGY: Ask a completely DIFFERENT type of concrete question about a topic they DO know.\n'
      section += 'Move to a different aspect entirely - don\'t ask similar questions.\n'
      section += '\n✅ PIVOT TO DIFFERENT TOPICS:\n'
      section += '- If unknown about era → pivot to geography: "Are they from Europe?"\n'
      section += '- If unknown about region → pivot to role: "Were they a president?"\n'
      section += '- If unknown about characteristics → pivot to time: "Are they still alive?"\n'
      section += '- If unknown about role → pivot to gender: "Are they male?"\n'
    }
    
    if (hasRecentMaybe) {
      section += '\n📍 PARTIAL YES RESPONSE DETECTED:\n'
      section += 'The user just gave a "Sometimes/Maybe" answer - this is a WEAK CONFIRMATION.\n'
      section += 'STRATEGY: Build on this partial information to get more specific details.\n'
      section += 'Ask follow-up questions that help distinguish this item from others with similar properties.\n'
      section += '\n✅ BUILD ON PARTIAL CONFIRMATION:\n'
      section += '- If "sometimes in bedroom" → ask about primary location: "Is it mainly found in kitchens?"\n'
      section += '- If "sometimes electronic" → ask about specific features: "Does it need batteries?"\n'
      section += '- If "sometimes wild" → ask about domestication: "Is it commonly kept as a pet?"\n'
      section += '- If "sometimes used for work" → ask about specific function: "Is it primarily for entertainment?"\n'
      section += '\n🎯 GOAL: Find the PRIMARY or MOST DISTINCTIVE characteristic!\n'
    }

    return section
  }

  /**
   * Builds domain narrowing analysis section
   */
  static buildDomainNarrowingAnalysis(facts: FactsByAnswer): string {
    if (facts.yesFacts.length === 0 && facts.noFacts.length === 0 && facts.maybeFacts.length === 0) {
      return ''
    }
    
    return '\n🎯 DOMAIN NARROWING ANALYSIS:\n' +
           'Before asking your next question, analyze what domain space remains possible based on ALL the confirmed facts above.\n' +
           'Ask yourself: "Given these confirmed facts (including partial YES answers), what specific sub-domain am I now working within?"\n' +
           'Your next question MUST further narrow within that established domain - do NOT jump to unrelated properties!\n' +
           '\nExamples of proper domain narrowing:\n' +
           '- If confirmed: "mammal + wild animal" → ask about size, habitat, diet within wild mammals\n' +
           '- If confirmed: "cricket player + from Australia" → ask about batting/bowling, era, specific team\n' +
           '- If confirmed: "electronic + found in home" → ask about size, room, specific function\n' +
           '- If partial: "sometimes in bedroom" → ask about primary location or specific room\n' +
           '\n❌ DOMAIN VIOLATION EXAMPLES (DO NOT DO THIS):\n' +
           '- If confirmed "mammal + wild" and you ask "Is it electronic?" (completely wrong domain)\n' +
           '- If confirmed "Australian bowler" and you ask "Is it alive?" (already established as person)\n'
  }

  /**
   * Builds the complete enhanced system prompt
   */
  static buildEnhancedSystemPrompt(
    baseSystemPrompt: string,
    category: string,
    facts: FactsByAnswer,
    allAskedQuestions: string[],
    currentQuestionNumber: number,
    suggestedQuestion?: string
  ): string {
    const categorizedSummary = this.buildCategorizedSummary(facts)
    const logicalDeductions = this.buildLogicalDeductions(category, facts)
    const repetitionPrevention = this.buildRepetitionPrevention(allAskedQuestions)
    const redundancyCheck = this.buildRedundancyCheck(facts)
    const specialResponseHandling = this.buildSpecialResponseHandling(facts, currentQuestionNumber)
    const domainNarrowingAnalysis = this.buildDomainNarrowingAnalysis(facts)
    const categoryConstraints = this.buildCategoryConstraints(category)

    const suggestionSection = suggestedQuestion 
      ? `RECOMMENDED QUESTION: "${suggestedQuestion}"\nThis question was suggested by decision tree analysis for optimal information gain.\nUse this question unless it's clearly redundant with what you already know.`
      : ''

    return `${baseSystemPrompt}

${categorizedSummary}${logicalDeductions}${repetitionPrevention}${redundancyCheck}${specialResponseHandling}${domainNarrowingAnalysis}

${categoryConstraints}

${suggestionSection}

LOGICAL DEDUCTION - If you know:
- "Is it a mammal?" = YES, then you know it's NOT a bird, reptile, or fish
- "Is it living?" = YES, then you know it's NOT electronic, furniture, or objects
- "Is it dead?" = YES, then you know it's NOT alive

AVOID REDUNDANCY:
- DON'T ask "Is it a bird?" if they already said YES to "Is it a mammal?"
- DON'T ask "Is it alive?" if they already answered about being dead
- DON'T ask compound questions like "Is it big or small?" - pick one

🚫 NEVER ASK VAGUE QUESTIONS:
- "Does it have unique characteristics?" → Ask "Are they male?" instead
- "Is it from a specific region?" → Ask "Are they from Europe?" instead  
- "Does it have multiple forms?" → Ask "Were they both military and political?" instead
- "Is it from a time period?" → Ask "Did they serve before 1990?" instead
- "Does it have notable aspects?" → Ask "Did they win a war?" instead

✅ ALWAYS ASK CONCRETE, SPECIFIC QUESTIONS:
- Geographic: "Are they from Asia?", "Did they lead Germany?"
- Temporal: "Did they serve before 1990?", "Were they active in the 2000s?"
- Demographic: "Are they male?", "Are they still alive?"
- Functional: "Were they a president?", "Did they win a Nobel Prize?"

Ask your next strategic yes/no question. Output ONLY the question.`
  }

  /**
   * Builds category-specific constraints to prevent cross-contamination
   */
  static buildCategoryConstraints(category: string): string {
    let constraints = `\n🎯 CATEGORY: ${category.toUpperCase()} - STRICT CATEGORY CONSTRAINTS:\n`
    
    switch (category.toLowerCase()) {
      case 'world leaders':
        constraints += `
WORLD LEADERS ONLY - The item is a HUMAN POLITICAL LEADER. You are guessing which specific world leader.

❌ FORBIDDEN QUESTIONS (these don't apply to people):
- "Is it black?" / "Is it a color?" → World leaders are PEOPLE, not objects with colors
- "Is it plastic?" / "Is it made of metal?" → World leaders are PEOPLE, not materials
- "Is it smaller than a book?" → World leaders are PEOPLE, not objects with sizes
- "Is it electronic?" → World leaders are PEOPLE, not devices
- "Can you hold it?" → World leaders are PEOPLE, not objects
- "Is it furniture?" → World leaders are PEOPLE, not objects

✅ APPROPRIATE QUESTIONS FOR WORLD LEADERS:
- "Are they male?" / "Are they female?"
- "Are they still alive?" / "Are they dead?"
- "Are they from Europe?" / "Are they from Asia?"
- "Were they a president?" / "Were they a prime minister?"
- "Did they serve before 1990?" / "Were they active in the 21st century?"
- "Did they win a Nobel Prize?" / "Did they lead during a war?"

CRITICAL: ONLY ask questions that apply to HUMAN POLITICAL LEADERS!`
        break
        
      case 'animals':
        constraints += `
ANIMALS ONLY - The item is a LIVING CREATURE (or recently living animal). You are guessing which specific animal.

❌ FORBIDDEN QUESTIONS (these don't apply to animals):
- "Are they a president?" → Animals are not political leaders
- "Did they serve before 1990?" → Animals don't have political careers
- "Are they from Europe?" → Use habitat questions instead: "Do they live in Africa?"
- "Is it electronic?" → Animals are biological, not electronic
- "Is it furniture?" → Animals are living beings, not objects

✅ APPROPRIATE QUESTIONS FOR ANIMALS:
- "Is it a mammal?" / "Is it a bird?" / "Is it a reptile?"
- "Is it a wild animal?" / "Is it a domestic pet?"
- "Is it larger than a dog?" / "Is it smaller than a cat?"
- "Does it live in Africa?" / "Does it live in water?"
- "Does it eat meat?" / "Is it a carnivore?"
- "Does it have four legs?" / "Can it fly?"

CRITICAL: ONLY ask questions that apply to LIVING ANIMALS!`
        break
        
      case 'objects':
        constraints += `
OBJECTS ONLY - The item is an INANIMATE OBJECT/THING. You are guessing which specific object.

❌ FORBIDDEN QUESTIONS (these don't apply to objects):
- "Are they male?" → Objects don't have gender
- "Are they alive?" → Objects are not living
- "Are they a president?" → Objects are not people
- "Did they serve before 1990?" → Objects don't have careers
- "Do they eat meat?" → Objects don't eat

✅ APPROPRIATE QUESTIONS FOR OBJECTS:
- "Is it electronic?" / "Does it need electricity?"
- "Can you hold it in one hand?" / "Is it portable?"
- "Is it made of metal?" / "Is it made of plastic?"
- "Is it found in a kitchen?" / "Is it found in a bedroom?"
- "Is it larger than a book?" / "Is it smaller than a car?"
- "Do most people use it daily?" / "Is it a tool?"

CRITICAL: ONLY ask questions that apply to INANIMATE OBJECTS!`
        break
        
      case 'cricket players':
      case 'football players':
      case 'nba players':
        constraints += `
SPORTS PLAYERS ONLY - The item is a HUMAN ATHLETE. You are guessing which specific ${category.toLowerCase()}.

❌ FORBIDDEN QUESTIONS (these don't apply to people):
- "Is it black?" / "Is it a color?" → Athletes are PEOPLE, not objects with colors
- "Is it plastic?" / "Is it electronic?" → Athletes are PEOPLE, not objects
- "Is it smaller than a book?" → Athletes are PEOPLE, not objects
- "Can you hold it?" → Athletes are PEOPLE, not objects

✅ APPROPRIATE QUESTIONS FOR ${category.toUpperCase()}:
- "Are they currently active?" / "Are they retired?"
- "Are they male?" / "Are they female?"
- "Are they from [specific country]?"
- "Have they won a championship?" / "Are they a Hall of Famer?"
- "Did they play before 2000?" / "Are they from the modern era?"
- Position/role specific questions for the sport

CRITICAL: ONLY ask questions that apply to HUMAN ATHLETES!`
        break
        
      default:
        constraints += `
Stay within the category "${category}". Do not ask questions that don't apply to this category.
Ask only relevant, category-appropriate questions.`
    }
    
    return constraints
  }
}