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
      categorizedSummary += '\n? UNKNOWN (Don\'t know answers - AVOID these topic areas):\n'
      facts.unknownFacts.forEach(item => { 
        categorizedSummary += `  → ${item.q}\n`
      })
      categorizedSummary += '\n🚫 CRITICAL: Do NOT ask questions about these topic areas or similar concepts!\n'
      categorizedSummary += 'The user lacks knowledge in these areas - pivot to completely different topics.\n'
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
    
    section += '\n🚫 COMPREHENSIVE SEMANTIC SIMILARITY PREVENTION:\n'
    section += 'CRITICAL: You must ask a NEW question that is completely different from all questions above!\n'
    section += '\n❌ FORBIDDEN SEMANTIC DUPLICATES - These are the SAME question:\n'
    section += '• "Are they from Europe?" = "Are they European?" = "Do they come from Europe?"\n'
    section += '• "Is it big?" = "Is it large?" = "Is it huge?" = "Is it massive?"\n'
    section += '• "Is it electronic?" = "Is it digital?" = "Does it use electricity?"\n'
    section += '• "Are they currently active?" = "Are they still playing?" = "Do they play now?"\n'
    section += '• "Were they president?" = "Did they serve as president?" = "Did they hold the presidency?"\n'
    section += '• "Does it eat meat?" = "Is it carnivorous?" = "Is it a predator?"\n'
    section += '• "Can you hold it?" = "Is it handheld?" = "Is it portable?"\n'
    section += '• "Are they male?" = "Are they a man?" = "Are they masculine?"\n'
    section += '\n🔍 BEFORE ASKING YOUR QUESTION:\n'
    section += '1. Check if it uses SYNONYMS of words already asked\n'
    section += '2. Check if it asks the SAME CONCEPT with different grammar\n'
    section += '3. Check if it can be DEDUCED from existing answers\n'
    section += '4. Ensure it provides genuinely NEW information\n'
    
    section += '\n📋 SEMANTIC SIMILARITY CHECKLIST - Your question MUST pass ALL checks:\n'
    section += '1. ✅ WORD VARIATION CHECK: Am I using different words for the same concept?\n'
    section += '   ❌ "big" vs "large" vs "huge" vs "enormous" vs "massive" (ALL same concept)\n'
    section += '   ❌ "famous" vs "well-known" vs "popular" vs "renowned" (ALL same concept)\n'
    section += '   ❌ "European" vs "from Europe" vs "in Europe" (ALL same concept)\n'
    
    section += '2. ✅ TOPIC SIMILARITY CHECK: Am I asking about the same topic area?\n'
    section += '   ❌ If asked "Are they alive?" don\'t ask "Are they dead?" (same topic)\n'
    section += '   ❌ If asked "Are they male?" don\'t ask "Are they female?" (same topic)\n'
    section += '   ❌ If asked "Is it electronic?" don\'t ask "Is it digital?" (same topic)\n'
    
    section += '3. ✅ LOGICAL CONSEQUENCE CHECK: Can I deduce this answer from confirmed facts?\n'
    section += '   ❌ If "mammal"=YES, don\'t ask "Is it a bird?" (logically impossible)\n'
    section += '   ❌ If "European"=YES, don\'t ask "Are they Asian?" (mutually exclusive)\n'
    section += '   ❌ If "electronic"=YES, don\'t ask "Is it alive?" (category violation)\n'
    
    section += '4. ✅ CATEGORY CONSISTENCY CHECK: Does this fit the established category?\n'
    section += '   ❌ If category=PEOPLE, don\'t ask "Is it made of metal?" (wrong category)\n'
    section += '   ❌ If category=OBJECTS, don\'t ask "Are they male?" (wrong category)\n'
    section += '   ❌ If category=ANIMALS, don\'t ask "Were they elected?" (wrong category)\n'
    
    section += '5. ✅ INFORMATION NOVELTY CHECK: Will this provide genuinely NEW information?\n'
    section += '   ❌ Don\'t ask about properties you can already infer\n'
    section += '   ❌ Don\'t ask about combinations of confirmed facts\n'
    section += '   ✅ Ask about unexplored dimensions that narrow possibilities\n'
    
    section += '\n🎯 SEMANTIC DISTANCE REQUIREMENT:\n'
    section += 'Your next question must be semantically DISTANT from all previous questions.\n'
    section += 'If you\'ve asked about SIZE, switch to FUNCTION. If you\'ve asked about LOCATION, switch to TIME PERIOD.\n'
    section += 'If you\'ve asked about ROLE, switch to GEOGRAPHY. If you\'ve asked about ERA, switch to ACHIEVEMENTS.\n'
    section += 'GOAL: Maximum semantic distance = Maximum new information gained!\n'

    return section
  }

  /**
   * Extracts topic areas that the user doesn't know about to avoid asking similar questions
   */
  private static extractUnknownTopicAreas(unknownFacts: Array<{ n: number, q: string }>): string[] {
    const topicAreas: string[] = []
    const unknownQuestions = unknownFacts.map(fact => fact.q.toLowerCase())
    
    const topicGroups = [
      { area: 'Time Period/Era (century, decade, historical period, when they lived/served)', keywords: ['time', 'era', 'period', 'century', 'decade', 'when', 'before', 'after', 'during', 'recent', 'historical', 'modern', 'ancient', 'served', 'lived'] },
      { area: 'Geography/Location (country, region, continent, nationality)', keywords: ['country', 'nation', 'nationality', 'from', 'region', 'area', 'place', 'location', 'where', 'continent', 'europe', 'asia', 'africa', 'america', 'european', 'asian', 'african', 'american'] },
      { area: 'Leadership/Political Roles (president, minister, type of leader)', keywords: ['president', 'leader', 'prime minister', 'head', 'ruler', 'king', 'queen', 'monarch', 'dictator', 'emperor', 'political', 'government', 'role', 'position'] },
      { area: 'Achievement/Success/Fame (awards, accomplishments, recognition)', keywords: ['won', 'champion', 'award', 'prize', 'famous', 'successful', 'achievement', 'accomplished', 'victory', 'recognition', 'notable', 'significant'] },
      { area: 'Physical Characteristics/Appearance (size, color, material)', keywords: ['size', 'big', 'large', 'small', 'tiny', 'huge', 'color', 'appearance', 'looks', 'made', 'material', 'physical', 'characteristics'] },
      { area: 'Function/Purpose/Use (what it does, how it works)', keywords: ['use', 'function', 'purpose', 'tool', 'instrument', 'equipment', 'work', 'designed', 'does', 'works', 'used'] },
      { area: 'Technology/Electronics (digital, electronic, technical aspects)', keywords: ['electronic', 'digital', 'technology', 'tech', 'computer', 'machine', 'device', 'gadget', 'technical', 'digital'] },
      { area: 'Personal Details (gender, age, personal life)', keywords: ['male', 'female', 'gender', 'age', 'personal', 'family', 'married', 'children', 'private', 'life'] },
      { area: 'Activity Status (current, retired, active, former)', keywords: ['active', 'current', 'retired', 'former', 'still', 'playing', 'serving', 'working', 'status'] },
      { area: 'Category/Classification (type, kind, classification)', keywords: ['type', 'kind', 'category', 'classification', 'species', 'genre', 'class', 'group'] }
    ]
    
    for (const group of topicGroups) {
      const hasUnknownInThisArea = group.keywords.some(keyword => 
        unknownQuestions.some(q => q.includes(keyword))
      )
      if (hasUnknownInThisArea) {
        topicAreas.push(group.area)
      }
    }
    
    return topicAreas
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
   * Builds comprehensive redundancy check section
   */
  static buildRedundancyCheck(facts: FactsByAnswer): string {
    if (facts.yesFacts.length === 0 && facts.noFacts.length === 0 && facts.maybeFacts.length === 0) return ''
    
    let section = '\n🚫 COMPREHENSIVE REDUNDANCY AVOIDANCE - CRITICAL ANALYSIS:\n'
    
    // Redundancy from confirmed facts
    if (facts.yesFacts.length > 0) {
      section += '\n⚠️  CONFIRMED TRUE PROPERTIES - DO NOT ASK ABOUT THESE AGAIN:\n'
      facts.yesFacts.forEach(fact => {
        section += `  → Already confirmed: ${fact.q}\n`
      })
      section += '  🚨 DO NOT ask variations, synonyms, or logical consequences of these confirmed facts!\n'
    }
    
    if (facts.noFacts.length > 0) {
      section += '\n⚠️  CONFIRMED FALSE PROPERTIES - DO NOT ASK ABOUT THESE AGAIN:\n'
      facts.noFacts.forEach(fact => {
        section += `  → Already eliminated: ${fact.q}\n`
      })
      section += '  🚨 DO NOT ask about mutually exclusive opposites of these eliminated facts!\n'
    }
    
    // Logical redundancy prevention
    section += '\n🧠 LOGICAL REDUNDANCY PREVENTION:\n'
    section += 'Before asking ANY question, check these redundancy patterns:\n'
    section += '1. ✅ SYNONYM CHECK: Am I asking the same concept with different words?\n'
    section += '   Example: "big" vs "large" vs "huge" vs "enormous" (ALL the same concept)\n'
    section += '2. ✅ LOGICAL CONSEQUENCE CHECK: Can I deduce this from confirmed facts?\n'
    section += '   Example: If "mammal"=YES confirmed, don\'t ask "Is it a bird?" (impossible)\n'
    section += '3. ✅ MUTUAL EXCLUSION CHECK: Am I asking about something already eliminated?\n'
    section += '   Example: If "European"=YES confirmed, don\'t ask "Are they from Asia?" (impossible)\n'
    section += '4. ✅ COMBINATION CHECK: Am I asking about confirmed fact combinations?\n'
    section += '   Example: If "electronic"=YES + "handheld"=YES, don\'t ask "Is it a portable device?"\n'
    section += '5. ✅ CATEGORY VIOLATION CHECK: Does this question fit the established category?\n'
    section += '   Example: If confirmed "human leader", don\'t ask "Is it made of metal?"\n'
    
    section += '\n🔄 SPECIFIC REDUNDANCY PATTERNS TO AVOID:\n'
    section += '• Rephrasing confirmed facts: "alive"=NO → don\'t ask "Are they dead?"\n'
    section += '• Size synonyms: "big", "large", "huge", "enormous", "massive" (pick ONE)\n'
    section += '• Location synonyms: "European", "from Europe", "in Europe" (pick ONE)\n'
    section += '• Status synonyms: "famous", "well-known", "popular", "renowned" (pick ONE)\n'
    section += '• Asking opposites of confirmed facts: "male"=YES → don\'t ask "female"\n'
    section += '• Asking logical impossibilities: "mammal"=YES → don\'t ask "bird", "fish", "reptile"\n'
    
    return section
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
    
    // Add comprehensive unknown areas avoidance guidance
    if (facts.unknownFacts.length > 0) {
      section += '\n🚫 UNKNOWN AREAS AVOIDANCE - CRITICAL GUIDANCE:\n'
      section += 'The user has indicated "Don\'t know" for these topic areas. You MUST avoid asking questions in these or semantically similar areas:\n'
      
      const unknownTopicAreas = this.extractUnknownTopicAreas(facts.unknownFacts)
      if (unknownTopicAreas.length > 0) {
        section += '\n⚠️  AVOID THESE TOPIC AREAS:\n'
        unknownTopicAreas.forEach(area => {
          section += `  → ${area}\n`
        })
        section += '\n🚫 Do NOT ask variations, synonyms, or related questions about these topics!\n'
      }
    }
    
    if (hasRecentUncertain) {
      section += '\n⚠️ UNKNOWN RESPONSE DETECTED:\n'
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
   * Builds comprehensive domain narrowing analysis section
   */
  static buildDomainNarrowingAnalysis(facts: FactsByAnswer): string {
    if (facts.yesFacts.length === 0 && facts.noFacts.length === 0 && facts.maybeFacts.length === 0) {
      return ''
    }
    
    return '\n🎯 COMPREHENSIVE DOMAIN NARROWING ANALYSIS:\n' +
           'Before asking your next question, perform this systematic domain analysis:\n' +
           '\n📍 CURRENT DOMAIN IDENTIFICATION:\n' +
           '1. List ALL confirmed facts (YES answers + strong MAYBE answers)\n' +
           '2. List ALL eliminated possibilities (NO answers)\n' +
           '3. Identify the intersection: "What specific sub-domain contains ALL confirmed facts?"\n' +
           '4. Estimate domain size: How many items could still match this sub-domain?\n' +
           '\n🔍 DOMAIN BOUNDARY ENFORCEMENT:\n' +
           'Your next question MUST stay within the established domain boundaries.\n' +
           'DO NOT jump to completely unrelated properties that violate confirmed facts.\n' +
           'DO NOT ask about categories that contradict the established domain.\n' +
           '\n✅ PROPER DOMAIN NARROWING EXAMPLES:\n' +
           '- Domain: "wild mammal + carnivore + African" → ask "Is it larger than a lion?" (within domain)\n' +
           '- Domain: "electronic + handheld + daily use" → ask "Does it have a touchscreen?" (within domain)\n' +
           '- Domain: "historical leader + European + wartime" → ask "Did they lead Britain?" (within domain)\n' +
           '- Domain: "retired athlete + quarterback + champion" → ask "Did they play for Patriots?" (within domain)\n' +
           '\n❌ DOMAIN VIOLATION EXAMPLES (NEVER DO THIS):\n' +
           '- Domain: "wild mammal + carnivore" → ask "Is it electronic?" (WRONG: objects vs animals)\n' +
           '- Domain: "electronic device + handheld" → ask "Does it eat meat?" (WRONG: animals vs objects)\n' +
           '- Domain: "human leader + historical" → ask "Is it made of plastic?" (WRONG: objects vs people)\n' +
           '- Domain: "athlete + human" → ask "Is it a mammal?" (WRONG: animals vs people)\n' +
           '\n🎯 DOMAIN PROGRESSION STRATEGY:\n' +
           'Within your established domain, ask questions that:\n' +
           '• Further subdivide the domain space (e.g., "African mammals" → "large African mammals")\n' +
           '• Distinguish between similar items in the domain (e.g., "touchscreen phones" → "iPhones vs Androids")\n' +
           '• Eliminate the largest remaining clusters (e.g., if 50% are "modern leaders", ask about era)\n' +
           '• Prepare for final identification (e.g., after narrowing to 3-5 items, start specific guesses)\n'
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
    // CRITICAL: Category constraints must come FIRST to prevent contamination
    const categoryConstraints = this.buildCategoryConstraints(category)
    const categorizedSummary = this.buildCategorizedSummary(facts)
    const logicalDeductions = this.buildLogicalDeductions(category, facts)
    const repetitionPrevention = this.buildRepetitionPrevention(allAskedQuestions)
    const redundancyCheck = this.buildRedundancyCheck(facts)
    const specialResponseHandling = this.buildSpecialResponseHandling(facts, currentQuestionNumber)
    const domainNarrowingAnalysis = this.buildDomainNarrowingAnalysis(facts)

    // Validate suggested question against category before including it
    const suggestionSection = suggestedQuestion && this.isQuestionAppropriateForCategory(suggestedQuestion, category)
      ? `RECOMMENDED QUESTION: "${suggestedQuestion}"\nThis question was suggested by decision tree analysis for optimal information gain.\nUse this question unless it's clearly redundant with what you already know.`
      : suggestedQuestion
        ? `⚠️ DECISION TREE SUGGESTED INAPPROPRIATE QUESTION - IGNORED\nGenerate your own category-appropriate question instead.`
        : ''

    return `${baseSystemPrompt}

${categoryConstraints}

${categorizedSummary}${logicalDeductions}${repetitionPrevention}${redundancyCheck}${specialResponseHandling}${domainNarrowingAnalysis}

${suggestionSection}

NEVER ASK VAGUE QUESTIONS like "Is it special?" or "Does it have unique features?"

ALWAYS ASK CONCRETE, SPECIFIC QUESTIONS like "Is it made of metal?" or "Is it larger than a car?"

Think step by step, then ask your next strategic yes/no question.

<thinking>
[Your analysis of remaining possibilities and optimal question]
</thinking>

<question>Your final yes/no question here?</question>`
  }

  /**
   * Builds category-specific constraints to prevent cross-contamination
   */
  static buildCategoryConstraints(category: string): string {
    let constraints = `\n🎯 CATEGORY: ${category.toUpperCase()} - STRICT CATEGORY CONSTRAINTS:\n`
    
    switch (category.toLowerCase()) {
      case 'world leaders':
        constraints += `
🎯 WORLD LEADERS ONLY - The item is a HUMAN POLITICAL LEADER. You are guessing which specific world leader.

🚫 STRICTLY FORBIDDEN QUESTIONS (these don't apply to people):

❌ OBJECT/MATERIAL QUESTIONS (humans are not objects):
- "Is it black?" / "Is it white?" / "Is it red?" / "What color is it?" → World leaders are PEOPLE, not colored objects
- "Is it plastic?" / "Is it made of metal?" / "Is it made of wood?" / "What is it made of?" → World leaders are PEOPLE, not manufactured materials
- "Is it electronic?" / "Is it digital?" / "Does it need batteries?" / "Does it have circuits?" → World leaders are PEOPLE, not electronic devices
- "Can you hold it?" / "Is it portable?" / "Can you carry it?" → World leaders are PEOPLE, not objects you pick up
- "Is it furniture?" / "Is it a tool?" / "Is it a machine?" / "Is it equipment?" → World leaders are PEOPLE, not inanimate objects

❌ SIZE/PHYSICAL OBJECT QUESTIONS (humans are not sized objects):
- "Is it smaller than a book?" / "Is it bigger than a car?" / "How big is it?" → World leaders are PEOPLE with human proportions
- "Can it fit in your pocket?" / "Is it handheld?" / "Is it tiny?" → World leaders are PEOPLE, not pocket-sized objects
- "Does it weigh a lot?" / "Is it heavy?" / "Is it light?" → World leaders are PEOPLE, not objects with product weights

❌ ANIMAL/BIOLOGICAL QUESTIONS (humans are not animals):
- "Is it a mammal?" / "Is it a bird?" / "Is it a reptile?" → World leaders are PEOPLE, not animals to classify
- "Does it eat meat?" / "Is it carnivorous?" / "Is it herbivorous?" → World leaders are PEOPLE, not animals with diets
- "Does it have fur?" / "Does it have feathers?" / "Does it have scales?" → World leaders are PEOPLE, not animals with coats
- "Can it fly?" / "Does it swim?" / "Does it hibernate?" → World leaders are PEOPLE, not animals with special abilities

❌ CONSUMPTION/USAGE QUESTIONS (humans are not products):
- "Do you eat it?" / "Is it food?" / "Is it edible?" / "Can you drink it?" → World leaders are PEOPLE, not consumables
- "Do you wear it?" / "Is it clothing?" / "Do you use it?" → World leaders are PEOPLE, not products you use

✅ APPROPRIATE QUESTIONS FOR WORLD LEADERS:
- "Are they male?" / "Are they female?"
- "Are they still alive?" / "Are they dead?"
- "Are they from Europe?" / "Are they from Asia?" / "Are they from Africa?" / "Are they from the Americas?"
- "Were they a president?" / "Were they a prime minister?" / "Were they a monarch?"
- "Did they serve before 1990?" / "Were they active in the 21st century?" / "Did they serve in the 20th century?"
- "Did they win a Nobel Prize?" / "Did they lead during a war?" / "Were they democratically elected?"
- "Did they face impeachment proceedings?" / "Were they a military leader before politics?"

CRITICAL: ONLY ask questions that apply to HUMAN POLITICAL LEADERS!`
        break
        
      case 'animals':
        constraints += `
🎯 ANIMALS ONLY - The item is a LIVING CREATURE (or recently living animal). You are guessing which specific animal.

🚫 STRICTLY FORBIDDEN QUESTIONS (these don't apply to animals):

❌ HUMAN/POLITICAL QUESTIONS (animals are not people):
- "Are they a president?" / "Were they a leader?" / "Were they a politician?" → Animals are not political figures
- "Did they serve before 1990?" / "Were they elected?" / "Did they hold office?" → Animals don't have political careers
- "Are they male?" / "Are they female?" → Use "Is it male?" for animals (not "they")
- "Are they from Europe?" / "Are they European?" → Use habitat: "Do they live in Europe?" instead
- "Did they win awards?" / "Are they famous?" → Animals don't win human awards

❌ OBJECT/TECHNOLOGY QUESTIONS (animals are not objects):
- "Is it electronic?" / "Is it digital?" / "Does it need batteries?" → Animals are biological, not electronic devices
- "Is it furniture?" / "Is it a tool?" / "Is it equipment?" → Animals are living beings, not manufactured objects
- "Is it made of plastic?" / "Is it made of metal?" / "What material is it?" → Animals are not manufactured from materials
- "Can you hold it in your hand?" / "Is it portable?" → Ask about size relative to animals: "Is it smaller than a cat?"
- "Does it have buttons?" / "Does it have a screen?" → Animals don't have electronic interfaces

❌ COMMERCIAL/USAGE QUESTIONS (animals are not products):
- "Is it expensive?" / "Can you buy it?" / "How much does it cost?" → Focus on biological properties instead
- "Do you use it for work?" / "Is it a product?" → Animals are not commercial products
- "Can you wear it?" / "Do you eat it?" → While some animals are food, focus on the living animal's properties

❌ ABSTRACT/MANUFACTURED CONCEPTS (animals are biological entities):
- "Is it a concept?" / "Is it abstract?" / "Is it an idea?" → Animals are concrete living beings
- "Was it invented?" / "Was it designed?" / "Who created it?" → Animals evolved naturally

✅ APPROPRIATE QUESTIONS FOR ANIMALS:
- "Is it a mammal?" / "Is it a bird?" / "Is it a reptile?" / "Is it a fish?" / "Is it an insect?"
- "Is it a wild animal?" / "Is it a domestic pet?" / "Is it found on farms?"
- "Is it larger than a dog?" / "Is it smaller than a cat?" / "Is it bigger than a human?"
- "Does it live in Africa?" / "Does it live in water?" / "Does it live in forests?"
- "Does it eat meat?" / "Is it a carnivore?" / "Is it herbivorous?" / "Is it omnivorous?"
- "Does it have four legs?" / "Can it fly?" / "Does it have fur?" / "Does it lay eggs?"

CRITICAL: ONLY ask questions that apply to LIVING ANIMALS!`
        break
        
      case 'objects':
        constraints += `
🎯 OBJECTS ONLY - The item is an INANIMATE OBJECT/THING. You are guessing which specific object.

🚫 STRICTLY FORBIDDEN QUESTIONS (these don't apply to objects):

❌ HUMAN/POLITICAL QUESTIONS (objects are not people):
- "Are they male?" / "Are they female?" / "What gender are they?" → Objects don't have gender
- "Are they alive?" / "Do they breathe?" / "Are they dead?" → Objects are not living beings
- "Are they a president?" / "Did they serve?" / "Were they elected?" → Objects are not people with careers
- "Did they serve before 1990?" / "Were they born?" / "How old are they?" → Objects don't have political careers or ages
- "Are they from Europe?" / "What nationality are they?" → Objects aren't from countries (use "made in" instead)
- "Do they have feelings?" / "Are they happy?" / "Are they smart?" → Objects don't have emotions or intelligence

❌ BIOLOGICAL/ANIMAL QUESTIONS (objects are not living):
- "Do they eat meat?" / "Are they carnivorous?" / "What do they eat?" → Objects don't eat or have diets
- "Is it a mammal?" / "Is it a bird?" / "Is it a reptile?" → Objects are not biological classifications
- "Does it have fur?" / "Does it have feathers?" / "Does it have skin?" → Objects don't have biological features
- "Can it fly naturally?" / "Does it hibernate?" / "Does it migrate?" → Objects don't have natural biological behaviors
- "Is it wild?" / "Is it domesticated?" / "Is it a pet?" → Objects are not animals with habitats

❌ ABSTRACT/CONCEPTUAL QUESTIONS (objects are physical):
- "Is it a concept?" / "Is it an idea?" / "Is it abstract?" → Objects are physical, tangible things
- "Is it a feeling?" / "Is it an emotion?" / "Is it a thought?" → Objects are not mental concepts
- "Is it a service?" / "Is it software?" → Focus on physical objects, not services

❌ IMPOSSIBLE PHYSICAL PROPERTIES (objects follow physics):
- "Is it alive?" / "Does it grow?" / "Can it reproduce?" → Objects are not living organisms
- "Does it have consciousness?" / "Can it think?" / "Does it make decisions?" → Objects are not sentient

✅ APPROPRIATE QUESTIONS FOR OBJECTS:
- "Is it electronic?" / "Does it need electricity?" / "Does it have a screen?"
- "Can you hold it in one hand?" / "Is it portable?" / "Is it handheld?"
- "Is it made of metal?" / "Is it made of plastic?" / "Is it made of wood?"
- "Is it found in a kitchen?" / "Is it found in a bedroom?" / "Is it found outdoors?"
- "Is it larger than a book?" / "Is it smaller than a car?" / "Can it fit in a pocket?"
- "Do most people use it daily?" / "Is it a tool?" / "Is it furniture?" / "Is it decorative?"

CRITICAL: ONLY ask questions that apply to INANIMATE OBJECTS!`
        break
        
      case 'cricket players':
        constraints += `
CRICKET PLAYERS ONLY - The item is a HUMAN CRICKET ATHLETE. You are guessing which specific cricket player.

❌ FORBIDDEN QUESTIONS (these don't apply to people):
- "Is it black?" / "Is it a color?" / "What color is it?" → Cricket players are PEOPLE, not objects with colors
- "Is it plastic?" / "Is it electronic?" / "What is it made of?" → Cricket players are PEOPLE, not objects
- "Is it smaller than a book?" / "Can you hold it?" → Cricket players are PEOPLE, not objects
- "Is it furniture?" / "Is it a tool?" → Cricket players are PEOPLE, not objects
- "Does it need batteries?" / "Is it portable?" → Cricket players are PEOPLE, not devices

✅ APPROPRIATE QUESTIONS FOR CRICKET PLAYERS:
- "Are they currently active?" / "Are they retired?" / "Do they still play?"
- "Are they male?" / "Are they female?"
- "Are they from India?" / "Are they from Australia?" / "Are they from England?"
- "Are they a batsman?" / "Are they a bowler?" / "Are they a wicket-keeper?" / "Are they an all-rounder?"
- "Have they captained their country?" / "Are they a top-tier player?" / "Have they won major tournaments?"
- "Did they play before 2010?" / "Are they from the 1990s-2000s era?" / "Are they modern players?"

CRITICAL: ONLY ask questions that apply to HUMAN CRICKET PLAYERS!`
        break

      case 'football players':
        constraints += `
FOOTBALL PLAYERS ONLY - The item is a HUMAN FOOTBALL ATHLETE. You are guessing which specific football player.

❌ FORBIDDEN QUESTIONS (these don't apply to people):
- "Is it black?" / "Is it a color?" / "What color is it?" → Football players are PEOPLE, not objects with colors
- "Is it plastic?" / "Is it electronic?" / "What is it made of?" → Football players are PEOPLE, not objects
- "Is it smaller than a book?" / "Can you hold it?" → Football players are PEOPLE, not objects
- "Is it furniture?" / "Is it a tool?" → Football players are PEOPLE, not objects
- "Does it need batteries?" / "Is it portable?" → Football players are PEOPLE, not devices

✅ APPROPRIATE QUESTIONS FOR FOOTBALL PLAYERS:
- "Are they currently active?" / "Are they retired?" / "Do they still play?"
- "Are they male?" / "Are they female?"
- "Are they a quarterback?" / "Are they on offense?" / "Are they on defense?"
- "Have they won a Super Bowl?" / "Are they a Hall of Famer?" / "Have they won MVP?"
- "Have they played for the Patriots?" / "Are they AFC?" / "Are they NFC?"
- "Did they play before 2010?" / "Are they from the 2000s era?" / "Are they modern players?"

CRITICAL: ONLY ask questions that apply to HUMAN FOOTBALL PLAYERS!`
        break

      case 'nba players':
        constraints += `
NBA PLAYERS ONLY - The item is a HUMAN BASKETBALL ATHLETE. You are guessing which specific NBA player.

❌ FORBIDDEN QUESTIONS (these don't apply to people):
- "Is it black?" / "Is it a color?" / "What color is it?" → NBA players are PEOPLE, not objects with colors
- "Is it plastic?" / "Is it electronic?" / "What is it made of?" → NBA players are PEOPLE, not objects
- "Is it smaller than a book?" / "Can you hold it?" → NBA players are PEOPLE, not objects
- "Is it furniture?" / "Is it a tool?" → NBA players are PEOPLE, not objects
- "Does it need batteries?" / "Is it portable?" → NBA players are PEOPLE, not devices

✅ APPROPRIATE QUESTIONS FOR NBA PLAYERS:
- "Are they currently active?" / "Are they retired?" / "Do they still play?"
- "Are they male?" / "Are they female?"
- "Are they a guard?" / "Are they a center?" / "Are they a forward?"
- "Have they won an NBA championship?" / "Are they a MVP winner?" / "Are they a Hall of Famer?"
- "Have they played for the Lakers?" / "Are they Western Conference?" / "Are they Eastern Conference?"
- "Did they play before 2000?" / "Are they from the 1990s-2000s era?" / "Are they modern players?"

CRITICAL: ONLY ask questions that apply to HUMAN NBA PLAYERS!`
        break
        
      default:
        constraints += `
🎯 CATEGORY: ${category.toUpperCase()} - Stay within this category strictly.

🚫 SEMANTIC SIMILARITY PREVENTION:
- Do NOT ask questions that are synonyms or rephrasings of previous questions
- EXAMPLES of DUPLICATE questions to avoid:
  ❌ "Are they from Europe?" = "Are they European?" = "Do they come from Europe?"
  ❌ "Is it big?" = "Is it large?" = "Is it huge?" = "Is it massive?"
  ❌ "Is it electronic?" = "Is it digital?" = "Does it use electricity?"
  ❌ "Were they president?" = "Did they serve as president?" = "Are they a former president?"

🚨 CATEGORY CONTAMINATION PREVENTION:
- NEVER ask biological questions (alive, breathe, eat) for OBJECTS
- NEVER ask object questions (made of metal, electronic) for LIVING BEINGS
- NEVER ask animal questions (domesticated, wild) for PEOPLE
- NEVER ask human social questions (job, married) for ANIMALS

✅ APPROPRIATE QUESTIONS FOR ${category.toUpperCase()}:
- Ask specific, strategic questions relevant to this category
- Focus on distinguishing features within this category
- Use previous answers to narrow down possibilities logically

CRITICAL: Every question must be appropriate for "${category}" and not duplicate previous questions!`
    }
    
    return constraints
  }

  /**
   * Validates if a suggested question is appropriate for the given category
   */
  static isQuestionAppropriateForCategory(question: string, category: string): boolean {
    const lowerQuestion = question.toLowerCase()
    const lowerCategory = category.toLowerCase()
    
    switch (lowerCategory) {
      case 'world leaders':
        // Object/material questions are inappropriate for people
        const objectQuestions = [
          'made of', 'plastic', 'metal', 'wood', 'material', 'electronic', 'digital',
          'smaller than', 'bigger than', 'size', 'portable', 'handheld', 'hold it',
          'used for', 'communication', 'tool', 'furniture', 'device', 'machine',
          'color', 'black', 'white', 'red', 'blue', 'weigh', 'heavy', 'light',
          'famous', 'well-known', 'popular', 'controversial', 'important', 'significant'
        ]
        return !objectQuestions.some(phrase => lowerQuestion.includes(phrase))
        
      case 'animals':
        // Political/human questions are inappropriate for animals
        const politicalQuestions = [
          'president', 'prime minister', 'elected', 'political', 'served',
          'office', 'government', 'vote', 'democratic', 'leader'
        ]
        return !politicalQuestions.some(phrase => lowerQuestion.includes(phrase))
        
      case 'objects':
        // Biological/living questions are inappropriate for objects
        const biologicalQuestions = [
          'alive', 'living', 'breathe', 'eat', 'carnivore', 'herbivore',
          'mammal', 'bird', 'reptile', 'wild', 'domesticated', 'fur', 'feathers'
        ]
        return !biologicalQuestions.some(phrase => lowerQuestion.includes(phrase))
        
      default:
        return true // Allow all questions for unknown categories
    }
  }
}