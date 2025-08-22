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
   * Analyzes conversation state and provides pure analytical data
   * No question generation - only analysis for AI to consume
   */
  static analyzeConversationState(
    category: string, 
    conversationHistory: Array<{question: string, answer: string}>,
    remainingItems: string[]
  ): {
    shouldEnterGuessingPhase: boolean
    possibilitySpace: PossibilitySpace
    facts: Record<string, any>
    questionCount: number
    insights: {
      remainingCount: number
      topCandidates: string[]
      suggestedFocus: string[]
    }
  } {
    
    // Build current state from conversation
    const facts = this.extractFactsFromHistory(conversationHistory)
    const possibilitySpace = this.buildPossibilitySpace(category, facts, remainingItems)
    const questionCount = conversationHistory.length
    
    // Determine when to recommend guessing phase
    const shouldEnterGuessingPhase = this.shouldStartGuessing(possibilitySpace, questionCount, category)
    
    // Get analytical insights
    const insights = this.getAnalyticalInsights(category, facts, possibilitySpace)
    
    return {
      shouldEnterGuessingPhase,
      possibilitySpace,
      facts,
      questionCount,
      insights
    }
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

  /**
   * Private helper to get analytical insights
   */
  private static getAnalyticalInsights(
    category: string, 
    facts: Record<string, any>, 
    space: PossibilitySpace
  ): {
    remainingCount: number
    topCandidates: string[]
    suggestedFocus: string[]
  } {
    
    const remaining = space.remaining.length
    
    // Get top candidates based on confidence
    const topCandidates = Object.entries(space.confidence_scores)
      .filter(([item]) => space.remaining.includes(item))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item)
    
    // Suggest analytical focus areas based on category and current facts
    const suggestedFocus = this.getSuggestedFocusAreas(category, facts, remaining)
    
    return {
      remainingCount: remaining,
      topCandidates,
      suggestedFocus
    }
  }
  
  private static getSuggestedFocusAreas(
    category: string, 
    facts: Record<string, any>, 
    remaining: number
  ): string[] {
    
    const focus: string[] = []
    
    switch (category.toLowerCase()) {
      case 'animals':
        if (!facts.taxonomic_class) focus.push('biological classification')
        if (!facts.habitat) focus.push('habitat and geography')
        if (!facts.size) focus.push('size comparison')
        if (!facts.diet) focus.push('dietary behavior')
        break
      case 'objects':
        if (!facts.electronic) focus.push('technology type')
        if (!facts.size) focus.push('size and portability')
        if (!facts.material) focus.push('material composition')
        break
      case 'world leaders':
        if (!facts.life_status) focus.push('historical vs contemporary')
        if (!facts.geography) focus.push('geographic region')
        if (!facts.leadership_role) focus.push('type of leadership position')
        if (!facts.time_period) focus.push('era and time period')
        break
      default:
        focus.push('basic classification', 'key distinguishing features')
    }
    
    return focus
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
      uncertainQuestions: new Set<string>(),
      deducedFacts: new Set<string>()
    }
    
    history.forEach(({question, answer}) => {
      const q = question.toLowerCase().trim()
      const a = answer.toLowerCase().trim()
      const isYes = a.startsWith('y') || a === 'yes' || a.includes('yeah') || a.includes('yep')
      const isNo = a.startsWith('n') || a === 'no' || a.includes('nope')
      const isDontKnow = a === "don't know" || a === "dont know" || a === "i don't know" || a === "i dont know" || a === "not sure" || a === "uncertain"
      
      if (isYes) {
        facts.confirmedYes.add(q)
        // Add logical deductions
        this.addLogicalDeductions(q, true, facts)
      } else if (isNo) {
        facts.confirmedNo.add(q)
        // Add logical deductions
        this.addLogicalDeductions(q, false, facts)
      } else if (isDontKnow) {
        facts.uncertainQuestions.add(q)
        // No logical deductions for uncertain answers
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