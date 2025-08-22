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
    
    section += '\n<semantic_duplicate_examples>\n'
    section += '<!-- These are EXAMPLES of duplicate question patterns - DO NOT use these exact questions -->\n'
    section += '<duplicate_pattern>\n'
    section += '  <wrong_examples>"Are they from Europe?" = "Are they European?" = "Do they come from Europe?"</wrong_examples>\n'
    section += '  <rule>All ask the same concept: European origin</rule>\n'
    section += '</duplicate_pattern>\n'
    section += '<duplicate_pattern>\n'
    section += '  <wrong_examples>"Is it big?" = "Is it large?" = "Is it huge?" = "Is it massive?"</wrong_examples>\n'
    section += '  <rule>All ask the same concept: size/scale</rule>\n'
    section += '</duplicate_pattern>\n'
    section += '<duplicate_pattern>\n'
    section += '  <wrong_examples>"Is it electronic?" = "Is it digital?" = "Does it use electricity?"</wrong_examples>\n'
    section += '  <rule>All ask the same concept: electronic/technological nature</rule>\n'
    section += '</duplicate_pattern>\n'
    section += '<duplicate_pattern>\n'
    section += '  <wrong_examples>"Are they currently active?" = "Are they still playing?" = "Do they play now?"</wrong_examples>\n'
    section += '  <rule>All ask the same concept: current activity status</rule>\n'
    section += '</duplicate_pattern>\n'
    section += '</semantic_duplicate_examples>\n'
    
    section += '\n<validation_checklist>\n'
    section += 'BEFORE ASKING YOUR QUESTION, validate against these checks:\n'
    section += '<check name="synonym_check">\n'
    section += '  <question>Am I using different words for the same concept?</question>\n'
    section += '  <examples>\n'
    section += '    <!-- Examples of WRONG synonym usage - avoid these patterns -->\n'
    section += '    <wrong>"big" vs "large" vs "huge" vs "enormous" vs "massive" (ALL same concept)</wrong>\n'
    section += '    <wrong>"famous" vs "well-known" vs "popular" vs "renowned" (ALL same concept)</wrong>\n'
    section += '    <wrong>"European" vs "from Europe" vs "in Europe" (ALL same concept)</wrong>\n'
    section += '  </examples>\n'
    section += '</check>\n'
    
    section += '<check name="topic_similarity_check">\n'
    section += '  <question>Am I asking about the same topic area?</question>\n'
    section += '  <examples>\n'
    section += '    <!-- Examples of WRONG topic repetition - avoid these patterns -->\n'
    section += '    <wrong>If asked "Are they alive?" don\'t ask "Are they dead?" (same topic)</wrong>\n'
    section += '    <wrong>If asked "Are they male?" don\'t ask "Are they female?" (same topic)</wrong>\n'
    section += '    <wrong>If asked "Is it electronic?" don\'t ask "Is it digital?" (same topic)</wrong>\n'
    section += '  </examples>\n'
    section += '</check>\n'
    
    section += '<check name="logical_consequence_check">\n'
    section += '  <question>Can I deduce this answer from confirmed facts?</question>\n'
    section += '  <examples>\n'
    section += '    <!-- Examples of WRONG logical redundancy - avoid these patterns -->\n'
    section += '    <wrong>If "mammal"=YES, don\'t ask "Is it a bird?" (logically impossible)</wrong>\n'
    section += '    <wrong>If "European"=YES, don\'t ask "Are they Asian?" (mutually exclusive)</wrong>\n'
    section += '    <wrong>If "electronic"=YES, don\'t ask "Is it alive?" (category violation)</wrong>\n'
    section += '  </examples>\n'
    section += '</check>\n'
    
    section += '<check name="category_consistency_check">\n'
    section += '  <question>Does this question fit the established category?</question>\n'
    section += '  <examples>\n'
    section += '    <!-- Examples of WRONG category mixing - avoid these patterns -->\n'
    section += '    <wrong>If category=PEOPLE, don\'t ask "Is it made of metal?" (wrong category)</wrong>\n'
    section += '    <wrong>If category=OBJECTS, don\'t ask "Are they male?" (wrong category)</wrong>\n'
    section += '    <wrong>If category=ANIMALS, don\'t ask "Were they elected?" (wrong category)</wrong>\n'
    section += '  </examples>\n'
    section += '</check>\n'
    section += '</validation_checklist>\n'
    
    section += '\n<semantic_distance_strategy>\n'
    section += 'Your next question must be semantically DISTANT from all previous questions.\n'
    section += '<strategy_examples>\n'
    section += '  <!-- These are strategic EXAMPLES - use similar logic but different questions -->\n'
    section += '  <strategy>If you\'ve asked about SIZE, switch to FUNCTION</strategy>\n'
    section += '  <strategy>If you\'ve asked about LOCATION, switch to TIME PERIOD</strategy>\n'
    section += '  <strategy>If you\'ve asked about ROLE, switch to GEOGRAPHY</strategy>\n'
    section += '  <strategy>If you\'ve asked about ERA, switch to ACHIEVEMENTS</strategy>\n'
    section += '</strategy_examples>\n'
    section += 'GOAL: Maximum semantic distance = Maximum new information gained!\n'
    section += '</semantic_distance_strategy>\n'

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

🚫 STRICTLY FORBIDDEN QUESTION PATTERNS (these don't apply to people):

<forbidden_patterns>
<category name="object_material_questions" reason="humans are not objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it black?" → World leaders are PEOPLE, not colored objects</wrong_example>
    <wrong_example>"Is it made of metal?" → World leaders are PEOPLE, not manufactured materials</wrong_example>
    <wrong_example>"Is it electronic?" → World leaders are PEOPLE, not electronic devices</wrong_example>
    <wrong_example>"Can you hold it?" → World leaders are PEOPLE, not objects you pick up</wrong_example>
  </examples>
  <rule>NEVER ask about physical materials, colors, or object properties when dealing with people</rule>
</category>

<category name="size_physical_questions" reason="humans are not sized objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it smaller than a book?" → World leaders are PEOPLE with human proportions</wrong_example>
    <wrong_example>"Is it handheld?" → World leaders are PEOPLE, not pocket-sized objects</wrong_example>
    <wrong_example>"Is it heavy?" → World leaders are PEOPLE, not objects with product weights</wrong_example>
  </examples>
  <rule>NEVER ask about size comparisons to objects or weight when dealing with people</rule>
</category>

<category name="animal_biological_questions" reason="humans are not animals">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it a mammal?" → World leaders are PEOPLE, not animals to classify</wrong_example>
    <wrong_example>"Does it eat meat?" → World leaders are PEOPLE, not animals with diets</wrong_example>
    <!-- These are EXAMPLES of good question patterns -->ample>
  </examples>
  <rule>NEVER ask animal classification or biological trait questions when dealing with people</rule>
</category>

<category name="consumption_usage_questions" reason="humans are not products">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it edible?" → World leaders are PEOPLE, not consumables</wrong_example>
    <!-- These are EXAMPLES of good question patterns -->>
  </examples>
  <rule>NEVER ask about consumption, usage, or commercial properties when dealing with people</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR WORLD LEADERS:

<appropriate_patterns>
<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they male?" / "Are they female?"</good_example>
    <good_example>"Are they still alive?" / "Are they deceased?"</good_example>
  </examples>
  <rule>Ask about gender, life status, and personal characteristics</rule>
</category>

<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they from Europe?" / "Are they from Asia?"</good_example>
    <good_example>"Are they from Africa?" / "Are they from the Americas?"</good_example>
  </examples>
  <rule>Ask about continental or regional origin</rule>
</category>

<category name="political_roles">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Were they a president?" / "Were they a prime minister?"</good_example>
    <good_example>"Were they a monarch?" / "Were they a dictator?"</good_example>
  </examples>
  <rule>Ask about specific political positions and roles</rule>
</category>

<category name="time_periods">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Did they serve before 1990?" / "Were they active in the 21st century?"</good_example>
    <good_example>"Did they serve in the 20th century?" / "Are they from recent decades?"</good_example>
  </examples>
  <rule>Ask about time periods and eras of leadership</rule>
</category>

<category name="achievements_circumstances">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Did they win a Nobel Prize?" / "Did they lead during a war?"</good_example>
    <good_example>"Were they democratically elected?" / "Did they face impeachment?"</good_example>
  </examples>
  <rule>Ask about notable achievements, circumstances, or controversies</rule>
</category>
</appropriate_patterns>

<instruction>
CRITICAL: Use the patterns above as GUIDANCE to create your own similar questions. 
DO NOT use the exact example questions shown - they are templates to show you the RIGHT TYPE of questions to ask.
ONLY ask questions that apply to HUMAN POLITICAL LEADERS!
</instruction>`
        break
        
      case 'animals':
        constraints += `
🎯 ANIMALS ONLY - The item is a LIVING CREATURE (or recently living animal). You are guessing which specific animal.

🚫 STRICTLY FORBIDDEN QUESTION PATTERNS (these don't apply to animals):

<forbidden_patterns>
<category name="human_political_questions" reason="animals are not people">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Are they a president?" → Animals are not political figures</wrong_example>
    <wrong_example>"Did they serve before 1990?" → Animals don't have political careers</wrong_example>
    <wrong_example>"Were they elected?" → Animals don't participate in politics</wrong_example>
  </examples>
  <rule>NEVER ask about political roles, elections, or human social positions when dealing with animals</rule>
</category>

<category name="object_technology_questions" reason="animals are not objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it electronic?" → Animals are biological, not electronic devices</wrong_example>
    <wrong_example>"Is it made of plastic?" → Animals are not manufactured from materials</wrong_example>
    <wrong_example>"Is it a tool?" → Animals are living beings, not manufactured objects</wrong_example>
  </examples>
  <rule>NEVER ask aboutn dealing with animals</rule>
</category>

<category name="commercial_usage_questions" reason="animals are not products">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it expensive?" → Focus on biological properties instead</wrong_example>
    <wrong_example>"Do you use it for work?" → Animals are not commercial products</wrong_example>
    <wrong_example>"Can you buy it?" → Animals are living beings, not products</wrong_example>
  </examples>
  <rule>NEVER ask about price, commercial use, or product properties when dealing with animals</rule>
</category>

<category name="abstract_concepts" reason="animals are biological entities">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it a concept?" → Animals are concrete living beings</wrong_example>
    <wrong_example>"Was it invented?" → Animals evolved naturally</wrong_example>
  </examples>
  <rule>NEVER ask about abstract concepts or human inventions when dealing with animals</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR ANIMALS:

<appropriate_patterns>
<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it a mammal?" / "Is it a bird?" / "Is it a reptile?"</good_example>
    <good_example>"Is it a fish?" / "Is it an insect?" / "Is it an amphibian?"</good_example>
  </examples>
  <rule>Ask about taxonomic classification and biological categories</rule>
</category>

<category name="habitat_lifestyle">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it a wild animal?" / "Is it domesticated?" / "Is it found on farms?"</good_example>
    <good_example>"Does it live in water?" / "Does it live in forests?" / "Does it live in Africa?"</good_example>
  </examples>
  <rule>Ask about natural habitats, domestication status, and geographic distribution</rule>
</category>

<category name="physical_characteristics">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it larger than a dog?" / "Is it smaller than a cat?"</good_example>
    <good_example>"Does it have four legs?" / "Does it have fur?" / "Does it lay eggs?"</good_example>
  </examples>
  <rule>Ask about size relative to other animals and distinctive physical features</rule>
</category>

<category name="behavior_diet">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Does it eat meat?" / "Is it a carnivore?" / "Is it herbivorous?"</good_example>
    <good_example>"Can it fly?" / "Does it swim?" / "Is it nocturnal?"</good_example>
  </examples>
  <rule>Ask about dietary habits, movement capabilities, and behavioral patterns</rule>
</category>
</appropriate_patterns>

<instruction>
CRITICAL: Use the patterns above as GUIDANCE to create your own similar questions. 
DO NOT use the exact example questions shown - they are templates to show you the RIGHT TYPE of questions to ask.
ONLY ask questions that apply to LIVING ANIMALS!
Use "Is it" (not "Are they") when referring to animals.
</instruction>`
        break
        
      case 'objects':
        constraints += `
🎯 OBJECTS ONLY - The item is an INANIMATE OBJECT/THING. You are guessing which specific object.

🚫 STRICTLY FORBIDDEN QUESTION PATTERNS (these don't apply to objects):

<forbidden_patterns>
<category name="human_political_questions" reason="objects are not people">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Are they male?" → Objects don't have gender</wrong_example>
    <wrong_example>"Are they alive?" → Objects are not living beings</wrong_example>
    <wrong_example>"Are they a president?" → Objects are not people with careers</wrong_example>
    <wrong_example>"Are they from Europe?" → Objects aren't from countries</wrong_example>
  </examples>
  <rule>NEVER ask about gender, life, political roles, or nationality when dealing with objects</rule>
</category>

<category name="biological_animal_questions" reason="objects are not living">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Do they eat meat?" → Objects don't eat or have diets</wrong_example>
    <wrong_example>"Is it a mammal?" → Objects are not biological classifications</wrong_example>
    <wrong_example>"Does it have fur?" → Objects don't have biological features</wrong_example>
    <wrong_example>"Does it migrate?" → Objects don't have natural behaviors</wrong_example>
  </examples>
  <rule>NEVER ask aboutling with objects</rule>
</category>

<category name="abstract_conceptual_questions" reason="objects are physical">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it a concept?" → Objects are physical, tangible things</wrong_example>
    <wrong_example>"Is it an emotion?" → Objects are not mental concepts</wrong_example>
    <wrong_example>"Is it software?" → Focus on physical objects, not digital services</wrong_example>
  </examples>
  <rule>NEVER ask about abstract concepts, emotions, or non-physical entities when dealing with objects</rule>
</category>

<category name="impossible_properties" reason="objects follow physics">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Can it reproduce?" → Objects are not living organisms</wrong_example>
    <wrong_example>"Does it have consciousness?" → Objects are not sentient</wrong_example>
  </examples>
  <rule>NEVER ask about consciousness, reproduction, or autonomous decision-making when dealing with objects</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR OBJECTS:

<appropriate_patterns>
<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it electronic?" / "Does it need electricity?" / "Does it have a screen?"</good_example>
    <good_example>"Is it digital?" / "Does it connect to the internet?" / "Does it have buttons?"</good_example>
  </examples>
  <rule>Ask about electronic properties, power requirements, and technological features</rule>
</category>

<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Can you hold it in one hand?" / "Is it portable?" / "Is it handheld?"</good_example>
    <good_example>"Is it larger than a book?" / "Is it smaller than a car?" / "Can it fit in a pocket?"</good_example>
  </examples>
  <rule>Ask about size, portability, and physical handling characteristics</rule>
</category>

<category name="materials_construction">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it made of metal?" / "Is it made of plastic?" / "Is it made of wood?"</good_example>
    <good_example>"Is it made of glass?" / "Is it made of fabric?" / "Is it soft?"</good_example>
  </examples>
  <rule>Ask about construction materials and physical composition</rule>
</category>

<category name="location_usage">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it found in a kitchen?" / "Is it found in a bedroom?" / "Is it found outdoors?"</good_example>
    <good_example>"Do most people use it daily?" / "Is it used for work?" / "Is it decorative?"</good_example>
  </examples>
  <rule>Ask about typical locations, usage frequency, and functional purposes</rule>
</category>

<category name="category_classification">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Is it a tool?" / "Is it furniture?" / "Is it a vehicle?"</good_example>
    <good_example>"Is it clothing?" / "Is it an appliance?" / "Is it a toy?"</good_example>
  </examples>
  <rule>Ask about object categories and functional classifications</rule>
</category>
</appropriate_patterns>

<instruction>
CRITICAL: Use the patterns above as GUIDANCE to create your own similar questions. 
DO NOT use the exact example questions shown - they are templates to show you the RIGHT TYPE of questions to ask.
ONLY ask questions that apply to INANIMATE OBJECTS!
Use "Is it" when referring to objects.
</instruction>`
        break
        
      case 'cricket players':
        constraints += `
🎯 CRICKET PLAYERS ONLY - The item is a HUMAN CRICKET ATHLETE. You are guessing which specific cricket player.

🚫 STRICTLY FORBIDDEN QUESTION PATTERNS (these don't apply to people):

<forbidden_patterns>
<category name="object_material_questions" reason="cricket players are people, not objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it black?" → Cricket players are PEOPLE, not objects with colors</wrong_example>
    <wrong_example>"Is it made of plastic?" → Cricket players are PEOPLE, not manufactured objects</wrong_example>
    <wrong_example>"Can you hold it?" → Cricket players are PEOPLE, not handheld objects</wrong_example>
  </examples>
  <rule>NEVER ask about colors, materials, electronic properties, or physical handling when dealing with people</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR CRICKET PLAYERS:

<appropriate_patterns>
<category name="career_status">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they currently active?" / "Are they retired?" / "Do they still play?"</good_example>
    <good_example>"Are they playing international cricket?" / "Have they stopped playing?"</good_example>
  </examples>
  <rule>Ask about current playing status and career stage</rule>
</category>
<!-- These are EXAMPLES of good question patterns -->
<category name="personal_attributes">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they male?" / "Are they female?"</good_example>
  </examples>
  <rule>Ask about basic personal characteristics</rule>
</category>

<category name
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they from India?" / "Are they from Australia?" / "Are they from England?"</good_example>
    <good_example>"Do they represent Pakistan?" / "Are they from the West Indies?"</good_example>
  </examples>
  <rule>Ask about nationality and which country they represent</rule>
</category>

<category name="playing_role">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Are they a batsman?" / "Are they a bowler?" / "Are they an all-rounder?"</good_example>
    <good_example>"Are they a wicket-keeper?" / "Are they primarily a spinner?" / "Are they a fast bowler?"</good_example>
  </examples>
  <rule>Ask about their primary playing role and specialization</rule>
</category>

<category name="achievements_leadership">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Have they captained their country?" / "Have they won major tournaments?"</good_example>
    <good_example>"Are they in the Hall of Fame?" / "Have they won World Cups?"</good_example>
  </examples>
  <rule>Ask about leadership roles and major achievements</rule>
</category>

<category name="era_timeframe">
  <examples>
    <!-- These are EXAMPLES of good question patterns - use similar but not identical questions -->
    <good_example>"Did they play before 2010?" / "Are they from the 1990s-2000s era?"</good_example>
    <good_example>"Are they modern players?" / "Did they play in the 1980s?"</good_example>
  </examples>
  <rule>Ask about the era or time period when they played</rule>
</category>
</appropriate_patterns>

<instruction>
CRITICAL: Use the patterns above as GUIDANCE to create your own similar questions. 
DO NOT use the exact example questions shown - they are templates to show you the RIGHT TYPE of questions to ask.
ONLY ask questions that apply to HUMAN CRICKET PLAYERS!
Use "Are they" when referring to people.
</instruction>`
        break

      case 'football players':
        constraints += `
🎯 FOOTBALL PLAYERS ONLY - The item is a HUMAN FOOTBALL ATHLETE. You are guessing which specific football player.

<forbidden_patterns>
<category name="object_questions" reason="football players are people, not objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it black?" → Football players are PEOPLE, not objects with colors</wrong_example>
    <wrong_example>"Is it electronic?" → Football players are PEOPLE, not devices</wrong_example>
  </examples>
  <rule>NEVER ask about object properties when dealing with people</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR FOOTBALL PLAYERS:

<appropriate_patterns>
<category name="career_status">
  <examples>
    <good_example>"Are they currently active?" / "Are they retired?"</good_example>
  </examples>
  <rule>Ask about current playing status</rule>
</category>

<category name="position_role">
  <examples>
    <good_example>"Are they a quarterback?" / "Are they on offense?"</good_example>
  </examples>
  <rule>Ask about playing position and role</rule>
</category>

<category name="achievements">
  <examples>
    <good_example>"Have they won a Super Bowl?" / "Are they a Hall of Famer?"</good_example>
  </examples>
  <rule>Ask about major achievements and honors</rule>
</category>

<category name="team_conference">
  <examples>
    <good_example>"Have they played for the Patriots?" / "Are they AFC?"</good_example>
  </examples>
  <rule>Ask about teams and conference affiliations</rule>
</category>
</appropriate_patterns>

<instruction>
Use these patterns as GUIDANCE - create similar but NOT identical questions.
ONLY ask questions that apply to HUMAN FOOTBALL PLAYERS!
</instruction>`
        break

      case 'nba players':
        constraints += `
🎯 NBA PLAYERS ONLY - The item is a HUMAN BASKETBALL ATHLETE. You are guessing which specific NBA player.

<forbidden_patterns>
<category name="object_questions" reason="NBA players are people, not objects">
  <examples>
    <!-- These are EXAMPLES of wrong questions - DO NOT use these exact questions -->
    <wrong_example>"Is it black?" → NBA players are PEOPLE, not objects with colors</wrong_example>
    <wrong_example>"Is it electronic?" → NBA players are PEOPLE, not devices</wrong_example>
  </examples>
  <rule>NEVER ask about object properties when dealing with people</rule>
</category>
</forbidden_patterns>

✅ APPROPRIATE QUESTION PATTERNS FOR NBA PLAYERS:

<appropriate_patterns>
<category name="career_status">
  <examples>
    <good_example>"Are they currently active?" / "Are they retired?"</good_example>
  </examples>
  <rule>Ask about current playing status</rule>
</category>

<category name="position_role">
  <examples>
    <good_example>"Are they a guard?" / "Are they a center?"</good_example>
  </examples>
  <rule>Ask about playing position</rule>
</category>

<category name="achievements">
  <examples>
    <good_example>"Have they won an NBA championship?" / "Are they a MVP winner?"</good_example>
  </examples>
  <rule>Ask about major achievements</rule>
</category>

<category name="team_conference">
  <examples>
    <good_example>"Have they played for the Lakers?" / "Are they Western Conference?"</good_example>
  </examples>
  <rule>Ask about teams and conference</rule>
</category>
</appropriate_patterns>

<instruction>
Use these patterns as GUIDANCE - create similar but NOT identical questions.
ONLY ask questions that apply to HUMAN NBA PLAYERS!
</instruction>`
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