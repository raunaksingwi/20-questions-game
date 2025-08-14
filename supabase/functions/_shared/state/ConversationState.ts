import { GameMessage } from '../../../../shared/types.ts'

export interface FactDictionary {
  confirmed_yes: Array<{ question: string; confidence: number }>
  confirmed_no: Array<{ question: string; confidence: number }>
  uncertain: Array<{ question: string; answer: string }>
  eliminated_categories: string[]
  remaining_properties: string[]
}

export interface PossibilitySpace {
  total_items: string[]
  eliminated: string[]
  remaining: string[]
  confidence_scores: Record<string, number>
  category: string
}

export class ConversationState {
  
  /**
   * Extracts structured facts from conversation history
   */
  static extractFacts(messages: GameMessage[]): FactDictionary {
    const facts: FactDictionary = {
      confirmed_yes: [],
      confirmed_no: [],
      uncertain: [],
      eliminated_categories: [],
      remaining_properties: []
    }
    
    const questions: Record<number, string> = {}
    const answers: Record<number, string> = {}
    
    // Build Q&A pairs
    messages.forEach(msg => {
      if (msg.question_number && msg.question_number > 0) {
        if (msg.role === 'assistant' && msg.message_type === 'question') {
          questions[msg.question_number] = msg.content
        } else if (msg.role === 'user' && msg.message_type === 'answer') {
          answers[msg.question_number] = msg.content
        }
      }
    })
    
    // Process each Q&A pair
    Object.keys(questions).forEach(qNum => {
      const questionNum = Number(qNum)
      const question = questions[questionNum]
      const answer = answers[questionNum]
      
      if (!question || !answer) return
      
      const normalizedAnswer = answer.toLowerCase().trim()
      const confidence = this.calculateAnswerConfidence(normalizedAnswer)
      
      if (this.isAffirmativeAnswer(normalizedAnswer)) {
        facts.confirmed_yes.push({ question, confidence })
        
        // Extract properties for category elimination
        if (question.toLowerCase().includes('living') || question.toLowerCase().includes('alive')) {
          facts.eliminated_categories.push('non-living')
        }
        if (question.toLowerCase().includes('animal')) {
          facts.eliminated_categories.push('plants', 'objects')
        }
      } else if (this.isNegativeAnswer(normalizedAnswer)) {
        facts.confirmed_no.push({ question, confidence })
        
        // Extract negative category information
        if (question.toLowerCase().includes('animal')) {
          facts.eliminated_categories.push('animals')
        }
      } else {
        facts.uncertain.push({ question, answer })
      }
    })
    
    return facts
  }
  
  /**
   * Builds possibility space for AI guessing mode
   */
  static buildPossibilitySpace(category: string, facts: FactDictionary, allItems: string[]): PossibilitySpace {
    const remaining = allItems.filter(item => {
      // Apply elimination logic based on facts
      return !this.isItemEliminated(item, facts, category)
    })
    
    const eliminated = allItems.filter(item => remaining.indexOf(item) === -1)
    
    // Calculate confidence scores based on how well each item fits the facts
    const confidence_scores: Record<string, number> = {}
    remaining.forEach(item => {
      confidence_scores[item] = this.calculateItemFitScore(item, facts, category)
    })
    
    return {
      total_items: allItems,
      eliminated,
      remaining,
      confidence_scores,
      category
    }
  }
  
  /**
   * Calculates information gain for potential questions
   */
  static calculateInformationGain(possibilitySpace: PossibilitySpace, potentialQuestion: string): number {
    const remainingCount = possibilitySpace.remaining.length
    if (remainingCount <= 1) return 0
    
    // Estimate how many items would be eliminated by this question
    // This is a simplified heuristic - in practice you'd need domain knowledge
    let estimatedElimination = 0
    
    // Category-specific elimination patterns
    if (potentialQuestion.toLowerCase().includes('living')) {
      estimatedElimination = Math.floor(remainingCount * 0.5) // Divides roughly in half
    } else if (potentialQuestion.toLowerCase().includes('edible')) {
      estimatedElimination = Math.floor(remainingCount * 0.3) // Food vs non-food
    } else if (potentialQuestion.toLowerCase().includes('size') || potentialQuestion.toLowerCase().includes('small')) {
      estimatedElimination = Math.floor(remainingCount * 0.4)
    } else {
      estimatedElimination = Math.floor(remainingCount * 0.25) // Default property
    }
    
    // Information gain is higher when we eliminate closer to half the remaining items
    const optimal = remainingCount / 2
    const distance = Math.abs(estimatedElimination - optimal)
    return Math.max(0, optimal - distance) / remainingCount
  }
  
  /**
   * Suggests next optimal question based on information theory
   */
  static suggestOptimalQuestion(possibilitySpace: PossibilitySpace, previousQuestions: string[]): string {
    const category = possibilitySpace.category.toLowerCase()
    const remainingCount = possibilitySpace.remaining.length
    
    // If very few items remain, ask specific confirmatory questions
    if (remainingCount <= 3 && remainingCount > 0) {
      const topItem = Object.entries(possibilitySpace.confidence_scores)
        .sort(([,a], [,b]) => b - a)[0]
      if (topItem) {
        return `Is it ${topItem[0].toLowerCase()}?`
      }
    }
    
    // Generate category-specific optimal questions based on binary search strategy
    const questionCandidates = this.generateQuestionCandidates(category, possibilitySpace, previousQuestions)
    
    // Calculate information gain for each candidate
    let bestQuestion = questionCandidates[0] || "Is it commonly found in homes?"
    let maxGain = 0
    
    questionCandidates.forEach(question => {
      const gain = this.calculateInformationGain(possibilitySpace, question)
      if (gain > maxGain) {
        maxGain = gain
        bestQuestion = question
      }
    })
    
    return bestQuestion
  }
  
  private static generateQuestionCandidates(category: string, space: PossibilitySpace, previousQuestions: string[]): string[] {
    const asked = previousQuestions.map(q => q.toLowerCase())
    const candidates: string[] = []
    
    // Category-specific question templates
    switch (category) {
      case 'animals':
        if (!asked.some(q => q.includes('mammal'))) candidates.push("Is it a mammal?")
        if (!asked.some(q => q.includes('domesticated') || q.includes('pet'))) candidates.push("Is it commonly kept as a pet?")
        if (!asked.some(q => q.includes('wild'))) candidates.push("Does it live in the wild?")
        if (!asked.some(q => q.includes('carnivore') || q.includes('meat'))) candidates.push("Does it eat meat?")
        if (!asked.some(q => q.includes('fly'))) candidates.push("Can it fly?")
        if (!asked.some(q => q.includes('water') || q.includes('aquatic'))) candidates.push("Does it live in water?")
        break
        
      case 'food':
        if (!asked.some(q => q.includes('sweet'))) candidates.push("Is it sweet?")
        if (!asked.some(q => q.includes('fruit'))) candidates.push("Is it a fruit?")
        if (!asked.some(q => q.includes('cooked') || q.includes('prepared'))) candidates.push("Is it typically cooked before eating?")
        if (!asked.some(q => q.includes('meat'))) candidates.push("Is it a type of meat?")
        if (!asked.some(q => q.includes('vegetable'))) candidates.push("Is it a vegetable?")
        if (!asked.some(q => q.includes('grain'))) candidates.push("Is it made from grains?")
        break
        
      case 'objects':
        if (!asked.some(q => q.includes('electronic'))) candidates.push("Is it electronic?")
        if (!asked.some(q => q.includes('furniture'))) candidates.push("Is it furniture?")
        if (!asked.some(q => q.includes('tool'))) candidates.push("Is it a tool?")
        if (!asked.some(q => q.includes('hold') || q.includes('handheld'))) candidates.push("Can you hold it in your hand?")
        if (!asked.some(q => q.includes('metal'))) candidates.push("Is it made of metal?")
        if (!asked.some(q => q.includes('home') || q.includes('house'))) candidates.push("Is it commonly found in homes?")
        break
        
      default:
        candidates.push("Is it living?", "Is it man-made?", "Is it larger than a car?")
    }
    
    return candidates
  }
  
  private static isItemEliminated(item: string, facts: FactDictionary, category: string): boolean {
    // Simple elimination logic - in practice this would be much more sophisticated
    // and would require a knowledge base about items and their properties
    
    for (const fact of facts.confirmed_no) {
      if (this.wouldItemContradict(item, fact.question, category)) {
        return true
      }
    }
    
    return false
  }
  
  private static wouldItemContradict(item: string, question: string, category: string): boolean {
    // Simplified logic - in practice this needs extensive domain knowledge
    const itemLower = item.toLowerCase()
    const questionLower = question.toLowerCase()
    
    // Example: if question is "Is it a mammal?" and answer was "No", eliminate mammals
    if (questionLower.includes('mammal') && category === 'animals') {
      const mammals = ['dog', 'cat', 'elephant', 'lion', 'whale', 'horse', 'cow']
      return mammals.some(mammal => itemLower.includes(mammal))
    }
    
    return false
  }
  
  private static calculateItemFitScore(item: string, facts: FactDictionary, category: string): number {
    // Calculate how well an item fits all the confirmed facts
    let score = 1.0
    
    // Deduct points for each fact that doesn't fit (simplified)
    facts.confirmed_yes.forEach(fact => {
      if (!this.itemMatchesFact(item, fact.question, true, category)) {
        score -= 0.2
      }
    })
    
    facts.confirmed_no.forEach(fact => {
      if (!this.itemMatchesFact(item, fact.question, false, category)) {
        score -= 0.2
      }
    })
    
    return Math.max(0, score)
  }
  
  private static itemMatchesFact(item: string, question: string, expectedAnswer: boolean, category: string): boolean {
    // Simplified matching logic - would need extensive domain knowledge in practice
    return true // Placeholder - implement based on your domain knowledge
  }
  
  private static calculateAnswerConfidence(answer: string): number {
    if (answer.includes('definitely') || answer.includes('absolutely')) return 1.0
    if (answer.includes('probably') || answer.includes('likely')) return 0.8
    if (answer.includes('maybe') || answer.includes('sometimes')) return 0.5
    if (answer.includes('unsure') || answer.includes("don't know")) return 0.2
    return 0.9 // Default high confidence for simple yes/no
  }
  
  private static isAffirmativeAnswer(answer: string): boolean {
    return answer.startsWith('y') || answer === 'yes' || 
           answer.includes('yeah') || answer.includes('yep') || 
           answer.includes('correct') || answer.includes('right')
  }
  
  private static isNegativeAnswer(answer: string): boolean {
    return answer.startsWith('n') || answer === 'no' || 
           answer.includes('nope') || answer.includes('wrong') || 
           answer.includes('incorrect')
  }
}