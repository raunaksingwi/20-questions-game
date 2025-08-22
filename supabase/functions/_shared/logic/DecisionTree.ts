import { ConversationState, PossibilitySpace } from '../state/ConversationState.ts'

export interface DecisionNode {
  question: string
  eliminates_on_yes: string[]
  eliminates_on_no: string[]
  information_gain: number
  priority: number
}

export class DecisionTree {
  
  /**
   * Generates the next optimal question using decision tree logic
   */
  static generateOptimalQuestion(
    category: string, 
    conversationHistory: Array<{question: string, answer: string}>,
    remainingItems: string[]
  ): string {
    
    // Build current state from conversation
    const facts = this.extractFactsFromHistory(conversationHistory)
    const possibilitySpace = this.buildPossibilitySpace(category, facts, remainingItems)
    const questionCount = conversationHistory.length
    
    // Determine when to start guessing based on category complexity and question count
    const shouldStartGuessing = this.shouldStartGuessing(possibilitySpace, questionCount, category)
    
    if (shouldStartGuessing) {
      return this.makeEducatedGuess(possibilitySpace)
    }
    
    // Generate decision tree nodes for potential questions
    const candidateNodes = this.generateCandidateQuestions(category, facts, possibilitySpace)
    
    // Filter out already-asked questions and logically redundant questions
    const askedQuestions = conversationHistory.map(h => h.question.toLowerCase())
    const unaskedNodes = candidateNodes.filter(node => {
      const nodeQ = node.question.toLowerCase()
      
      // Skip if already asked
      if (askedQuestions.some(asked => this.questionsAreSimilar(asked, nodeQ))) {
        return false
      }
      
      // Skip if answer is logically deducible from previous answers
      if (this.isQuestionRedundant(nodeQ, facts)) {
        return false
      }
      
      return true
    })
    
    if (unaskedNodes.length === 0) {
      // Fallback to generic exploration
      return this.generateFallbackQuestion(category, possibilitySpace, askedQuestions)
    }
    
    // Select the node with highest information gain
    const optimalNode = unaskedNodes.reduce((best, current) => 
      current.information_gain > best.information_gain ? current : best
    )
    
    return optimalNode.question
  }
  
  /**
   * Determines when the AI should start making educated guesses instead of asking questions
   */
  private static shouldStartGuessing(
    space: PossibilitySpace,
    questionCount: number,
    category: string
  ): boolean {
    const remaining = space.remaining.length
    
    // Always guess if only one item remains - this is definitive
    if (remaining === 1) {
      return true
    }
    
    // If we have no remaining items due to over-elimination, continue asking questions
    if (remaining === 0) {
      return false
    }
    
    // Category-specific guessing thresholds
    const getCategoryConfig = (cat: string) => {
      switch (cat.toLowerCase()) {
        case 'world leaders':
          // Complex category with many leaders - be more conservative
          return {
            minQuestions: 8,        // Don't guess before 8 questions
            maxRemaining: 3,        // Start guessing when 3 or fewer remain
            lateGameThreshold: 15   // Force guessing after 15 questions if ≤5 remain
          }
        case 'animals':
          return {
            minQuestions: 6,
            maxRemaining: 2,
            lateGameThreshold: 12
          }
        case 'objects':
          return {
            minQuestions: 6,
            maxRemaining: 2,
            lateGameThreshold: 12
          }
        case 'cricket players':
        case 'football players':
        case 'nba players':
          return {
            minQuestions: 7,
            maxRemaining: 3,
            lateGameThreshold: 14
          }
        default:
          return {
            minQuestions: 6,
            maxRemaining: 2,
            lateGameThreshold: 12
          }
      }
    }
    
    const config = getCategoryConfig(category)
    
    // Don't start guessing too early regardless of remaining items (except for single item)
    if (questionCount < config.minQuestions && remaining > 1) {
      return false
    }
    
    // Start guessing if we've narrowed down sufficiently
    if (remaining <= config.maxRemaining) {
      return true
    }
    
    // Force guessing in late game to avoid running out of questions
    if (questionCount >= config.lateGameThreshold && remaining <= 5) {
      return true
    }
    
    return false
  }

  private static generateCandidateQuestions(
    category: string, 
    facts: Record<string, any>, 
    space: PossibilitySpace
  ): DecisionNode[] {
    
    const nodes: DecisionNode[] = []
    const remaining = space.remaining.length
    
    switch (category.toLowerCase()) {
      case 'animals':
        nodes.push(...this.generateAnimalQuestions(facts, remaining))
        break
      case 'food':
        nodes.push(...this.generateFoodQuestions(facts, remaining))
        break
      case 'objects':
        nodes.push(...this.generateObjectQuestions(facts, remaining))
        break
      case 'world leaders':
        nodes.push(...this.generateWorldLeaderQuestions(facts, remaining))
        break
      case 'cricketers':
        nodes.push(...this.generateCricketerQuestions(facts, remaining))
        break
      default:
        nodes.push(...this.generateGenericQuestions(facts, remaining))
    }
    
    return nodes.sort((a, b) => b.information_gain - a.information_gain)
  }
  
  private static generateAnimalQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    const nodes: DecisionNode[] = []
    
    // Primary classification questions
    if (!facts.taxonomic_class) {
      nodes.push({
        question: "Is it a mammal?",
        eliminates_on_yes: ['birds', 'reptiles', 'amphibians', 'fish', 'insects'],
        eliminates_on_no: ['mammals'],
        information_gain: this.calculateGain(remaining, 0.4), // Mammals are ~40% of common animals
        priority: 10
      })
      
      nodes.push({
        question: "Is it a bird?",
        eliminates_on_yes: ['mammals', 'reptiles', 'amphibians', 'fish', 'insects'],
        eliminates_on_no: ['birds'],
        information_gain: this.calculateGain(remaining, 0.25),
        priority: 9
      })
    }
    
    // Habitat-based questions
    if (!facts.habitat) {
      nodes.push({
        question: "Does it live in water?",
        eliminates_on_yes: ['land_animals'],
        eliminates_on_no: ['aquatic_animals'],
        information_gain: this.calculateGain(remaining, 0.15),
        priority: 8
      })
      
      nodes.push({
        question: "Is it commonly found in the wild?",
        eliminates_on_yes: ['domestic_animals'],
        eliminates_on_no: ['wild_animals'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 7
      })
    }
    
    // Size-based questions
    if (!facts.size) {
      nodes.push({
        question: "Is it larger than a dog?",
        eliminates_on_yes: ['small_animals'],
        eliminates_on_no: ['large_animals'],
        information_gain: this.calculateGain(remaining, 0.35),
        priority: 6
      })
    }
    
    // Behavioral questions
    if (!facts.diet) {
      nodes.push({
        question: "Does it eat meat?",
        eliminates_on_yes: ['herbivores'],
        eliminates_on_no: ['carnivores'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 5
      })
    }
    
    return nodes
  }
  
  private static generateFoodQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    const nodes: DecisionNode[] = []
    
    // Primary category questions
    if (!facts.food_type) {
      nodes.push({
        question: "Is it a fruit?",
        eliminates_on_yes: ['vegetables', 'grains', 'proteins', 'dairy'],
        eliminates_on_no: ['fruits'],
        information_gain: this.calculateGain(remaining, 0.25),
        priority: 10
      })
      
      nodes.push({
        question: "Is it a vegetable?",
        eliminates_on_yes: ['fruits', 'grains', 'proteins', 'dairy'],
        eliminates_on_no: ['vegetables'],
        information_gain: this.calculateGain(remaining, 0.25),
        priority: 9
      })
      
      nodes.push({
        question: "Is it a type of meat?",
        eliminates_on_yes: ['fruits', 'vegetables', 'grains', 'dairy'],
        eliminates_on_no: ['meat', 'proteins'],
        information_gain: this.calculateGain(remaining, 0.2),
        priority: 8
      })
    }
    
    // Preparation method
    if (!facts.preparation) {
      nodes.push({
        question: "Is it typically cooked before eating?",
        eliminates_on_yes: ['raw_foods'],
        eliminates_on_no: ['cooked_foods'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 7
      })
    }
    
    // Taste profile
    if (!facts.taste) {
      nodes.push({
        question: "Is it sweet?",
        eliminates_on_yes: ['savory_foods'],
        eliminates_on_no: ['sweet_foods'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 6
      })
    }
    
    return nodes
  }
  
  private static generateObjectQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    const nodes: DecisionNode[] = []
    
    // Function-based classification
    if (!facts.category) {
      nodes.push({
        question: "Is it electronic?",
        eliminates_on_yes: ['non_electronic'],
        eliminates_on_no: ['electronic'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 10
      })
      
      nodes.push({
        question: "Is it furniture?",
        eliminates_on_yes: ['tools', 'electronics', 'clothing', 'kitchenware'],
        eliminates_on_no: ['furniture'],
        information_gain: this.calculateGain(remaining, 0.25),
        priority: 9
      })
      
      nodes.push({
        question: "Is it a tool?",
        eliminates_on_yes: ['furniture', 'electronics', 'decorative'],
        eliminates_on_no: ['tools'],
        information_gain: this.calculateGain(remaining, 0.2),
        priority: 8
      })
    }
    
    // Physical properties
    if (!facts.size) {
      nodes.push({
        question: "Can you hold it in your hand?",
        eliminates_on_yes: ['large_objects'],
        eliminates_on_no: ['handheld_objects'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 7
      })
    }
    
    // Material composition
    if (!facts.material) {
      nodes.push({
        question: "Is it made of metal?",
        eliminates_on_yes: ['plastic', 'wood', 'fabric'],
        eliminates_on_no: ['metal'],
        information_gain: this.calculateGain(remaining, 0.35),
        priority: 6
      })
    }
    
    return nodes
  }
  
  private static generateCricketerQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    const nodes: DecisionNode[] = []
    
    // Nationality-based questions
    if (!facts.nationality) {
      nodes.push({
        question: "Is he from India?",
        eliminates_on_yes: ['non_indian_players'],
        eliminates_on_no: ['indian_players'],
        information_gain: this.calculateGain(remaining, 0.4), // Many Indian players in common lists
        priority: 10
      })
      
      nodes.push({
        question: "Is he from England?",
        eliminates_on_yes: ['non_english_players'],
        eliminates_on_no: ['english_players'],
        information_gain: this.calculateGain(remaining, 0.15),
        priority: 9
      })
      
      nodes.push({
        question: "Is he from Australia?",
        eliminates_on_yes: ['non_australian_players'],
        eliminates_on_no: ['australian_players'],
        information_gain: this.calculateGain(remaining, 0.2),
        priority: 8
      })
    }
    
    // Playing style
    if (!facts.playing_style) {
      nodes.push({
        question: "Is he primarily a batsman?",
        eliminates_on_yes: ['bowlers', 'all_rounders'],
        eliminates_on_no: ['batsmen'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 7
      })
      
      nodes.push({
        question: "Is he a bowler?",
        eliminates_on_yes: ['pure_batsmen'],
        eliminates_on_no: ['bowlers', 'bowling_all_rounders'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 6
      })
    }
    
    // Career era
    if (!facts.era) {
      nodes.push({
        question: "Is he currently active?",
        eliminates_on_yes: ['retired_players'],
        eliminates_on_no: ['active_players'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 5
      })
    }
    
    return nodes
  }
  
  private static generateWorldLeaderQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    const nodes: DecisionNode[] = []
    
    // Life status questions
    if (!facts.life_status) {
      nodes.push({
        question: "Are they still alive?",
        eliminates_on_yes: ['deceased_leaders'],
        eliminates_on_no: ['living_leaders'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 10
      })
    }
    
    // Geographic questions
    if (!facts.geography) {
      nodes.push({
        question: "Are they from Europe?",
        eliminates_on_yes: ['non_european_leaders'],
        eliminates_on_no: ['european_leaders'],
        information_gain: this.calculateGain(remaining, 0.25),
        priority: 9
      })
      
      nodes.push({
        question: "Are they from Asia?",
        eliminates_on_yes: ['non_asian_leaders'],
        eliminates_on_no: ['asian_leaders'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 8
      })
      
      nodes.push({
        question: "Are they from Africa?",
        eliminates_on_yes: ['non_african_leaders'],
        eliminates_on_no: ['african_leaders'],
        information_gain: this.calculateGain(remaining, 0.15),
        priority: 7
      })
    }
    
    // Role-based questions
    if (!facts.leadership_role) {
      nodes.push({
        question: "Were they a president?",
        eliminates_on_yes: ['non_presidents'],
        eliminates_on_no: ['presidents'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 8
      })
      
      nodes.push({
        question: "Were they a prime minister?",
        eliminates_on_yes: ['non_prime_ministers'],
        eliminates_on_no: ['prime_ministers'],
        information_gain: this.calculateGain(remaining, 0.3),
        priority: 7
      })
    }
    
    // Era-based questions
    if (!facts.time_period) {
      nodes.push({
        question: "Did they serve in the 20th century?",
        eliminates_on_yes: ['pre_1900_leaders', 'post_2000_leaders'],
        eliminates_on_no: ['20th_century_leaders'],
        information_gain: this.calculateGain(remaining, 0.7),
        priority: 6
      })
      
      nodes.push({
        question: "Did they serve in the 1960s?",
        eliminates_on_yes: ['non_1960s_leaders'],
        eliminates_on_no: ['1960s_leaders'],
        information_gain: this.calculateGain(remaining, 0.1),
        priority: 5
      })
    }
    
    // Political system questions
    if (!facts.political_system) {
      nodes.push({
        question: "Did they lead a democratic country?",
        eliminates_on_yes: ['authoritarian_leaders'],
        eliminates_on_no: ['democratic_leaders'],
        information_gain: this.calculateGain(remaining, 0.6),
        priority: 4
      })
    }
    
    return nodes
  }
  
  private static generateGenericQuestions(facts: Record<string, any>, remaining: number): DecisionNode[] {
    return [
      {
        question: "Is it living?",
        eliminates_on_yes: ['non_living'],
        eliminates_on_no: ['living'],
        information_gain: this.calculateGain(remaining, 0.5),
        priority: 10
      },
      {
        question: "Is it man-made?",
        eliminates_on_yes: ['natural'],
        eliminates_on_no: ['artificial'],
        information_gain: this.calculateGain(remaining, 0.4),
        priority: 9
      }
    ]
  }
  
  private static calculateGain(remaining: number, splitRatio: number): number {
    if (remaining <= 1) return 0
    
    // Information gain calculation based on binary entropy
    const p = splitRatio
    const q = 1 - p
    
    const currentEntropy = 1 // Maximum entropy for unknown state
    const expectedEntropy = p * Math.log2(p || 0.01) + q * Math.log2(q || 0.01)
    
    return Math.abs(currentEntropy + expectedEntropy) // Higher is better
  }

  /**
   * Generates category-appropriate fallback question patterns when no items remain
   * These are dynamic templates to avoid overtraining on hardcoded questions
   */
  private static getCategorySpecificFallbackQuestions(category: string): string[] {
    const getRandomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    switch (category.toLowerCase()) {
      case 'world leaders':
        // Generate dynamic questions using templates
        const continents = ['Europe', 'Asia', 'Africa', 'the Americas', 'Oceania']
        const decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s']
        const roles = ['president', 'prime minister', 'chancellor', 'monarch']
        
        return [
          `Are they from ${getRandomFromArray(continents)}?`,
          `Did they serve in the ${getRandomFromArray(decades)}?`,
          `Were they a ${getRandomFromArray(roles)}?`,
          "Did they lead during a major conflict?",
          "Did they win a Nobel Peace Prize?"
        ]
        
      case 'animals':
        const habitats = ['Africa', 'Asia', 'North America', 'South America', 'Europe', 'Australia']
        const sizes = ['a cat', 'a dog', 'a horse', 'a mouse']
        const behaviors = ['carnivore', 'herbivore', 'omnivore']
        
        return [
          `Does it live in ${getRandomFromArray(habitats)}?`,
          `Is it larger than ${getRandomFromArray(sizes)}?`,
          `Is it a ${getRandomFromArray(behaviors)}?`,
          "Does it live in groups?",
          "Can it be domesticated?"
        ]
        
      case 'objects':
        const materials = ['plastic', 'metal', 'wood', 'glass', 'fabric']
        const locations = ['kitchens', 'bedrooms', 'offices', 'garages', 'bathrooms']
        const purposes = ['communication', 'entertainment', 'work', 'transportation', 'storage']
        
        return [
          `Is it made of ${getRandomFromArray(materials)}?`,
          `Is it commonly found in ${getRandomFromArray(locations)}?`,
          `Is it used for ${getRandomFromArray(purposes)}?`,
          "Does it require maintenance?",
          "Is it considered essential?"
        ]
        
      case 'cricket players':
      case 'football players':
      case 'nba players':
        const countries = ['India', 'Australia', 'England', 'South Africa', 'Pakistan']
        const eras = ['1990s', '2000s', '2010s', '2020s']
        
        return [
          `Are they from ${getRandomFromArray(countries)}?`,
          `Did they play in the ${getRandomFromArray(eras)}?`,
          "Have they been team captain?",
          "Are they in the Hall of Fame?",
          "Have they won major championships?"
        ]
        
      default:
        const timeFrames = ['1900', '1950', '1980', '2000']
        const properties = ['electricity', 'internet connection', 'batteries', 'maintenance']
        
        return [
          `Was it invented before ${getRandomFromArray(timeFrames)}?`,
          `Does it use ${getRandomFromArray(properties)}?`,
          "Is it found in nature?",
          "Do most people own one?",
          "Is it considered luxury?"
        ]
    }
  }
  
  private static makeEducatedGuess(space: PossibilitySpace): string {
    // If no items remain due to over-elimination, ask concrete backup questions
    if (space.remaining.length === 0) {
      // Use category-specific fallback questions instead of generic object questions
      const fallbackQuestions = this.getCategorySpecificFallbackQuestions(space.category)
      return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]
    }
    
    // If we have multiple items remaining, try a more strategic approach
    if (space.remaining.length > 1) {
      // For categories with people, try to distinguish between similar individuals
      if (this.isPersonCategory(space.category)) {
        return this.makePersonSpecificGuess(space)
      }
      
      // For other categories, pick the most likely candidate
      const sortedItems = Object.entries(space.confidence_scores)
        .filter(([item]) => space.remaining.includes(item))
        .sort(([,a], [,b]) => b - a)
      
      if (sortedItems.length > 0 && sortedItems[0][1] > 0.7) {
        // High confidence guess
        return `Is it ${this.formatItemName(sortedItems[0][0], space.category)}?`
      }
      
      // Medium confidence - try the top candidate
      if (sortedItems.length > 0) {
        return `Is it ${this.formatItemName(sortedItems[0][0], space.category)}?`
      }
    }
    
    // Single item remaining or fallback
    const targetItem = space.remaining[0]
    return `Is it ${this.formatItemName(targetItem, space.category)}?`
  }
  
  private static isPersonCategory(category: string): boolean {
    const personCategories = ['world leaders', 'cricket players', 'football players', 'nba players']
    return personCategories.includes(category.toLowerCase())
  }
  
  private static makePersonSpecificGuess(space: PossibilitySpace): string {
    // For people categories, format names properly and pick strategically
    const sortedCandidates = Object.entries(space.confidence_scores)
      .filter(([item]) => space.remaining.includes(item))
      .sort(([,a], [,b]) => b - a)
    
    if (sortedCandidates.length > 0) {
      const personName = sortedCandidates[0][0]
      return `Is it ${personName}?`
    }
    
    return `Is it ${space.remaining[0]}?`
  }
  
  private static formatItemName(item: string, category: string): string {
    // For people, use the name as-is
    if (this.isPersonCategory(category)) {
      return item
    }
    
    // For objects and animals, use lowercase with article
    return item.toLowerCase()
  }
  
  private static generateFallbackQuestion(
    category: string, 
    space: PossibilitySpace, 
    askedQuestions: string[]
  ): string {
    
    // Generate dynamic fallback questions to avoid hardcoded patterns
    const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    // Dynamic question templates based on common properties
    const commonProperties = ['expensive', 'modern', 'popular', 'useful', 'durable', 'complex']
    const sizeComparisons = ['a book', 'a car', 'a smartphone', 'a television', 'a basketball']
    const frequencies = ['daily', 'weekly', 'occasionally', 'regularly']
    const locations = ['homes', 'offices', 'schools', 'public places', 'outdoors']
    
    const dynamicFallbacks = [
      `Is it ${getRandomElement(commonProperties)}?`,
      `Is it larger than ${getRandomElement(sizeComparisons)}?`,
      `Do most people use it ${getRandomElement(frequencies)}?`,
      `Is it commonly found in ${getRandomElement(locations)}?`,
      `Is it considered a necessity?`,
      `Does it require special knowledge to use?`,
      `Is it something you would buy online?`,
      `Has it become more popular in recent years?`
    ]
    
    // Filter out semantically similar questions that have already been asked
    const unasked = dynamicFallbacks.filter(q => 
      !askedQuestions.some(asked => this.questionsAreSimilar(asked, q.toLowerCase()))
    )
    
    if (unasked.length > 0) {
      return getRandomElement(unasked)
    }
    
    // Ultimate fallback - try a category-specific approach
    return this.getCategorySpecificFallbackQuestions(category)[0] || 
           "Can you give me a hint about its most distinctive feature?"
  }
  
  private static questionsAreSimilar(q1: string, q2: string): boolean {
    // Simple similarity check - in practice would use more sophisticated NLP
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
    const n1 = normalize(q1)
    const n2 = normalize(q2)
    
    // Check for key word overlap
    const words1 = n1.split(' ')
    const words2 = n2.split(' ')
    const overlap = words1.filter(w => words2.includes(w) && w.length > 2)
    
    return overlap.length >= 2 || n1.includes(n2) || n2.includes(n1)
  }
  
  private static extractFactsFromHistory(history: Array<{question: string, answer: string}>): Record<string, any> {
    const facts: Record<string, any> = {
      confirmedYes: new Set<string>(),
      confirmedNo: new Set<string>(),
      deducedFacts: new Set<string>()
    }
    
    history.forEach(({question, answer}) => {
      const q = question.toLowerCase().trim()
      const a = answer.toLowerCase().trim()
      const isYes = a.startsWith('y') || a === 'yes' || a.includes('yeah') || a.includes('yep')
      const isNo = a.startsWith('n') || a === 'no' || a.includes('nope')
      
      if (isYes) {
        facts.confirmedYes.add(q)
        // Add logical deductions
        this.addLogicalDeductions(q, true, facts)
      } else if (isNo) {
        facts.confirmedNo.add(q)
        // Add logical deductions
        this.addLogicalDeductions(q, false, facts)
      }
      
      // Extract specific categories of information
      if (q.includes('mammal') || q.includes('bird') || q.includes('reptile')) {
        facts.taxonomic_class = isYes ? this.extractClass(q) : 'other'
      }
      if (q.includes('water') || q.includes('land') || q.includes('wild')) {
        facts.habitat = isYes ? this.extractHabitat(q) : 'other'
      }
      if (q.includes('large') || q.includes('small') || q.includes('hold')) {
        facts.size = isYes ? this.extractSize(q) : 'other'
      }
      if (q.includes('living') || q.includes('alive')) {
        facts.living_status = isYes ? 'living' : 'non-living'
      }
      if (q.includes('electronic')) {
        facts.electronic = isYes ? 'yes' : 'no'
      }
      if (q.includes('edible') || q.includes('eat')) {
        facts.edible = isYes ? 'yes' : 'no'
      }
    })
    
    return facts
  }
  
  private static addLogicalDeductions(question: string, answer: boolean, facts: Record<string, any>): void {
    const q = question.toLowerCase()
    
    if (answer) {
      // Positive deductions
      if (q.includes('mammal')) {
        facts.deducedFacts.add('is an animal')
        facts.deducedFacts.add('is living')
        facts.deducedFacts.add('is not a bird')
        facts.deducedFacts.add('is not a reptile')
        facts.deducedFacts.add('is not a fish')
      }
      if (q.includes('bird')) {
        facts.deducedFacts.add('is an animal')
        facts.deducedFacts.add('is living')
        facts.deducedFacts.add('is not a mammal')
        facts.deducedFacts.add('is not a reptile')
        facts.deducedFacts.add('is not a fish')
      }
      if (q.includes('living') || q.includes('alive')) {
        facts.deducedFacts.add('is not an object')
        facts.deducedFacts.add('is not electronic')
        facts.deducedFacts.add('is not furniture')
        facts.deducedFacts.add('is not a tool')
      }
      if (q.includes('electronic')) {
        facts.deducedFacts.add('is not living')
        facts.deducedFacts.add('is man-made')
        facts.deducedFacts.add('is not edible')
      }
      if (q.includes('dead')) {
        facts.deducedFacts.add('is not alive')
        facts.deducedFacts.add('was once living')
      }
    } else {
      // Negative deductions
      if (q.includes('mammal')) {
        // If not a mammal, could still be another type of animal
        // Don't make too strong assumptions
      }
      if (q.includes('living') || q.includes('alive')) {
        facts.deducedFacts.add('is not an animal')
        facts.deducedFacts.add('is not a plant')
        facts.deducedFacts.add('is not dead')
      }
      if (q.includes('dead')) {
        facts.deducedFacts.add('is alive')
      }
    }
  }
  
  private static isQuestionRedundant(question: string, facts: Record<string, any>): boolean {
    const q = question.toLowerCase()
    const confirmedYes = facts.confirmedYes || new Set()
    const confirmedNo = facts.confirmedNo || new Set()
    const deducedFacts = facts.deducedFacts || new Set()
    
    // Check if we can deduce the answer from confirmed facts
    if (q.includes('alive') || q.includes('living')) {
      if (deducedFacts.has('is living') || confirmedYes.has('is it living') || confirmedYes.has('is it alive')) return true
      if (deducedFacts.has('is not living') || confirmedNo.has('is it living') || confirmedNo.has('is it alive')) return true
    }
    
    if (q.includes('dead')) {
      if (deducedFacts.has('is not alive') || deducedFacts.has('is alive')) return true
      if (confirmedYes.has('is it alive') || confirmedNo.has('is it alive')) return true
    }
    
    if (q.includes('animal')) {
      if (deducedFacts.has('is an animal') || deducedFacts.has('is not an animal')) return true
      if (confirmedYes.has('is it a mammal') || confirmedYes.has('is it a bird')) return true
    }
    
    if (q.includes('mammal')) {
      if (deducedFacts.has('is not a mammal')) return true
      if (confirmedYes.has('is it a bird') || confirmedYes.has('is it a reptile') || confirmedYes.has('is it a fish')) return true
    }
    
    if (q.includes('bird')) {
      if (deducedFacts.has('is not a bird')) return true
      if (confirmedYes.has('is it a mammal') || confirmedYes.has('is it a reptile') || confirmedYes.has('is it a fish')) return true
    }
    
    if (q.includes('electronic')) {
      if (deducedFacts.has('is not electronic') || deducedFacts.has('is electronic')) return true
      if (confirmedYes.has('is it living') || confirmedYes.has('is it alive')) return true
    }
    
    // Check for contradictory combinations
    if (q.includes('or')) {
      // Questions like "Is it dead or alive?" are redundant if we know living status
      if ((q.includes('dead') && q.includes('alive')) && 
          (deducedFacts.has('is living') || deducedFacts.has('is not living') || 
           confirmedYes.has('is it living') || confirmedNo.has('is it living'))) {
        return true
      }
    }
    
    return false
  }
  
  private static extractClass(question: string): string {
    if (question.includes('mammal')) return 'mammal'
    if (question.includes('bird')) return 'bird'
    if (question.includes('reptile')) return 'reptile'
    return 'unknown'
  }
  
  private static extractHabitat(question: string): string {
    if (question.includes('water')) return 'aquatic'
    if (question.includes('wild')) return 'wild'
    return 'unknown'
  }
  
  private static extractSize(question: string): string {
    if (question.includes('large') || question.includes('big')) return 'large'
    if (question.includes('small') || question.includes('hold')) return 'small'
    return 'unknown'
  }
  
  private static buildPossibilitySpace(
    category: string, 
    facts: Record<string, any>, 
    allItems: string[]
  ): PossibilitySpace {
    
    // Actually filter items based on confirmed facts
    const remaining = allItems.filter(item => !this.isItemEliminated(item, facts, category))
    const eliminated = allItems.filter(item => this.isItemEliminated(item, facts, category))
    const confidence_scores: Record<string, number> = {}
    
    // Calculate confidence scores based on how well items match the facts
    remaining.forEach(item => {
      confidence_scores[item] = this.calculateItemConfidence(item, facts, category)
    })
    
    return {
      total_items: allItems,
      eliminated,
      remaining,
      confidence_scores,
      category
    }
  }
  
  private static isItemEliminated(item: string, facts: Record<string, any>, category: string): boolean {
    const itemLower = item.toLowerCase()
    const confirmedYes = facts.confirmedYes || new Set()
    const confirmedNo = facts.confirmedNo || new Set()
    const deducedFacts = facts.deducedFacts || new Set()
    
    // Generic elimination logic - check if any confirmed facts contradict this item
    // This is a simplified implementation that can be expanded with domain knowledge
    
    // For now, we'll consider an item eliminated if it has been explicitly ruled out
    // More sophisticated elimination logic can be added based on category-specific rules
    
    // Check if item has been explicitly eliminated
    if (confirmedNo.has(`is_${itemLower}`) || confirmedNo.has(itemLower)) {
      return true
    }
    
    // Check deduced facts for elimination
    if (deducedFacts.has(`not_${itemLower}`) || deducedFacts.has(`eliminated_${itemLower}`)) {
      return true
    }
    
    return false
  }
  
  private static calculateItemConfidence(item: string, facts: Record<string, any>, category: string): number {
    // Base confidence
    let confidence = 0.8
    
    // Adjust based on how well the item matches confirmed facts
    const confirmedYes = facts.confirmedYes || new Set()
    const confirmedNo = facts.confirmedNo || new Set()
    
    // This is a simplified approach - in practice you'd need extensive domain knowledge
    return Math.max(0.1, Math.min(1.0, confidence))
  }
}