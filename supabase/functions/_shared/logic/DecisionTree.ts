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
    
    // If only 1-2 items remain, make specific guesses
    if (possibilitySpace.remaining.length <= 2) {
      return this.makeEducatedGuess(possibilitySpace)
    }
    
    // Generate decision tree nodes for potential questions
    const candidateNodes = this.generateCandidateQuestions(category, facts, possibilitySpace)
    
    // Filter out already-asked questions
    const askedQuestions = conversationHistory.map(h => h.question.toLowerCase())
    const unaskedNodes = candidateNodes.filter(node => 
      !askedQuestions.some(asked => this.questionsAreSimilar(asked, node.question.toLowerCase()))
    )
    
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
  
  private static makeEducatedGuess(space: PossibilitySpace): string {
    if (space.remaining.length === 0) {
      return "Is it something I haven't considered yet?"
    }
    
    // Pick the item with highest confidence score
    const bestItem = Object.entries(space.confidence_scores)
      .filter(([item]) => space.remaining.includes(item))
      .sort(([,a], [,b]) => b - a)[0]
    
    if (bestItem) {
      return `Is it ${bestItem[0].toLowerCase()}?`
    }
    
    return `Is it ${space.remaining[0].toLowerCase()}?`
  }
  
  private static generateFallbackQuestion(
    category: string, 
    space: PossibilitySpace, 
    askedQuestions: string[]
  ): string {
    
    // Generic fallback questions that work across categories
    const fallbacks = [
      "Is it commonly found in homes?",
      "Is it expensive?",
      "Is it used daily by most people?",
      "Is it larger than a book?",
      "Is it considered modern?",
      "Is it colorful?",
      "Does it require maintenance?",
      "Is it portable?"
    ]
    
    const unasked = fallbacks.filter(q => 
      !askedQuestions.some(asked => this.questionsAreSimilar(asked, q.toLowerCase()))
    )
    
    return unasked[0] || "Can you give me a hint about its most distinctive feature?"
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
    const facts: Record<string, any> = {}
    
    history.forEach(({question, answer}) => {
      const q = question.toLowerCase()
      const a = answer.toLowerCase()
      
      // Extract categories of information
      if (q.includes('mammal') || q.includes('bird') || q.includes('reptile')) {
        facts.taxonomic_class = a.startsWith('y') ? this.extractClass(q) : 'other'
      }
      if (q.includes('water') || q.includes('land') || q.includes('wild')) {
        facts.habitat = a.startsWith('y') ? this.extractHabitat(q) : 'other'
      }
      if (q.includes('large') || q.includes('small') || q.includes('hold')) {
        facts.size = a.startsWith('y') ? this.extractSize(q) : 'other'
      }
    })
    
    return facts
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
    
    // For now, use all items as remaining - in practice would filter based on facts
    const remaining = allItems.slice()
    const eliminated: string[] = []
    const confidence_scores: Record<string, number> = {}
    
    // Assign confidence scores (simplified)
    remaining.forEach(item => {
      confidence_scores[item] = Math.random() * 0.3 + 0.7 // 0.7 to 1.0 range
    })
    
    return {
      total_items: allItems,
      eliminated,
      remaining,
      confidence_scores,
      category
    }
  }
}