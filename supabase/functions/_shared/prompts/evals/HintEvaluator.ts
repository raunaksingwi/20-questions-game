/**
 * Evaluator for hint generation prompts in the 20 Questions game.
 * Measures hint quality, novelty, consistency, and helpfulness without spoiling answers.
 */

import { BaseEvaluator, EvaluationMetric, TestScenario } from './BaseEvaluator.ts'

export interface HintTestScenario extends TestScenario {
  secretItem: string
  category: string
  hintsUsed: number
  questionsAsked: number
  conversationHistory: any[]
  previousHints: string[]
  establishedFacts: {
    confirmed_yes: Array<{ question: string, confidence: number }>
    confirmed_no: Array<{ question: string, confidence: number }>
    uncertain: Array<{ question: string, answer: string }>
  }
  expectedHintType?: 'early' | 'mid' | 'late' | 'very_late'
}

export class HintEvaluator extends BaseEvaluator {
  constructor() {
    super('HintEvaluator', 'hint_generation')
  }

  /**
   * Collects comprehensive metrics for hint generation evaluation
   */
  protected async collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]> {
    const testScenario = scenario as HintTestScenario
    const metrics: EvaluationMetric[] = []

    // Generate hint using the prompt structure from get-hint function
    const hintPrompt = this.buildHintPrompt(testScenario)
    const mockHintResponse = this.simulateHintGeneration(testScenario)

    // Core Hint Quality Metrics
    metrics.push(...this.evaluateHintQuality(mockHintResponse, testScenario))
    
    // Novelty and Information Value
    metrics.push(...this.evaluateHintNovelty(mockHintResponse, testScenario))
    
    // Consistency with Game State
    metrics.push(...this.evaluateHintConsistency(mockHintResponse, testScenario))
    
    // Spoiler Avoidance
    metrics.push(...this.evaluateSpoilerAvoidance(mockHintResponse, testScenario))
    
    // Progressive Disclosure Quality
    metrics.push(...this.evaluateProgressiveDisclosure(mockHintResponse, testScenario))
    
    // Context Awareness
    metrics.push(...this.evaluateContextAwareness(hintPrompt, testScenario))

    return metrics
  }

  /**
   * Evaluates overall hint quality and usefulness
   */
  private evaluateHintQuality(hint: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Hint length appropriateness
    const lengthScore = this.evaluateHintLength(hint, scenario.hintsUsed)
    metrics.push(this.createMetric(
      'hint_length_appropriateness',
      lengthScore,
      'Whether hint length is appropriate for context',
      0.7
    ))

    // Clarity and readability
    const clarityScore = this.evaluateHintClarity(hint)
    metrics.push(this.createMetric(
      'hint_clarity',
      clarityScore,
      'Clarity and readability of hint text',
      0.8
    ))

    // Actionability
    const actionabilityScore = this.evaluateHintActionability(hint)
    metrics.push(this.createMetric(
      'hint_actionability',
      actionabilityScore,
      'How actionable the hint is for narrowing guesses',
      0.7
    ))

    // Helpfulness without revealing
    const helpfulnessScore = this.evaluateHintHelpfulness(hint, scenario.secretItem)
    metrics.push(this.createMetric(
      'hint_helpfulness',
      helpfulnessScore,
      'How helpful hint is without revealing the answer',
      0.6
    ))

    return metrics
  }

  /**
   * Evaluates novelty and information value of hints
   */
  private evaluateHintNovelty(hint: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // New information ratio
    const noveltyScore = this.calculateHintNovelty(hint, scenario.establishedFacts, scenario.previousHints)
    metrics.push(this.createMetric(
      'hint_novelty',
      noveltyScore,
      'How much new information the hint provides',
      0.8
    ))

    // Repetition avoidance
    const repetitionAvoidance = this.calculateHintRepetitionAvoidance(hint, scenario.previousHints)
    metrics.push(this.createMetric(
      'hint_repetition_avoidance',
      repetitionAvoidance,
      'How well hint avoids repeating previous hints',
      0.9
    ))

    // Fact overlap minimization
    const factOverlapMinimization = this.calculateFactOverlapMinimization(hint, scenario.establishedFacts)
    metrics.push(this.createMetric(
      'fact_overlap_minimization',
      factOverlapMinimization,
      'How well hint avoids overlapping with known facts',
      0.85
    ))

    return metrics
  }

  /**
   * Evaluates consistency with current game state
   */
  private evaluateHintConsistency(hint: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Consistency with confirmed facts
    const factConsistency = this.evaluateFactConsistency(hint, scenario.establishedFacts, scenario.secretItem)
    metrics.push(this.createMetric(
      'fact_consistency',
      factConsistency,
      'Consistency with established facts about the item',
      0.95
    ))

    // Category appropriateness
    const categoryConsistency = this.evaluateCategoryConsistency(hint, scenario.category, scenario.secretItem)
    metrics.push(this.createMetric(
      'category_consistency',
      categoryConsistency,
      'Consistency with the specified category',
      0.9
    ))

    // Game stage appropriateness
    const stageConsistency = this.evaluateStageConsistency(hint, scenario.questionsAsked, scenario.hintsUsed)
    metrics.push(this.createMetric(
      'stage_consistency',
      stageConsistency,
      'Appropriateness for current game stage',
      0.7
    ))

    return metrics
  }

  /**
   * Evaluates how well hint avoids spoiling the answer
   */
  private evaluateSpoilerAvoidance(hint: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Direct answer avoidance
    const directAnswerAvoidance = this.evaluateDirectAnswerAvoidance(hint, scenario.secretItem)
    metrics.push(this.createMetric(
      'direct_answer_avoidance',
      directAnswerAvoidance,
      'How well hint avoids directly revealing the answer',
      0.99
    ))

    // Obvious clue avoidance
    const obviousClueAvoidance = this.evaluateObviousClueAvoidance(hint, scenario.secretItem)
    metrics.push(this.createMetric(
      'obvious_clue_avoidance',
      obviousClueAvoidance,
      'How well hint avoids overly obvious clues',
      0.8
    ))

    // Subtlety score
    const subtletyScore = this.evaluateHintSubtlety(hint, scenario.secretItem)
    metrics.push(this.createMetric(
      'hint_subtlety',
      subtletyScore,
      'Appropriate level of subtlety in hint',
      0.6
    ))

    return metrics
  }

  /**
   * Evaluates progressive disclosure based on game progression
   */
  private evaluateProgressiveDisclosure(hint: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Disclosure appropriateness for game stage
    const disclosureLevel = this.calculateDisclosureLevel(hint, scenario.secretItem)
    const appropriateDisclosure = this.evaluateDisclosureAppropriateness(
      disclosureLevel, 
      scenario.questionsAsked, 
      scenario.hintsUsed
    )
    
    metrics.push(this.createMetric(
      'disclosure_appropriateness',
      appropriateDisclosure,
      'Whether disclosure level matches game progression',
      0.7
    ))

    // Hint escalation quality
    const escalationQuality = this.evaluateHintEscalation(hint, scenario.previousHints, scenario.hintsUsed)
    metrics.push(this.createMetric(
      'hint_escalation_quality',
      escalationQuality,
      'Quality of hint escalation as game progresses',
      0.6
    ))

    return metrics
  }

  /**
   * Evaluates context awareness in hint generation
   */
  private evaluateContextAwareness(hintPrompt: string, scenario: HintTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Prompt structure quality
    const promptStructureQuality = this.evaluateHintPromptStructure(hintPrompt)
    metrics.push(this.createMetric(
      'hint_prompt_structure',
      promptStructureQuality,
      'Quality of hint generation prompt structure',
      0.8
    ))

    // Context integration
    const contextIntegration = this.evaluateContextIntegration(hintPrompt, scenario)
    metrics.push(this.createMetric(
      'context_integration',
      contextIntegration,
      'How well prompt integrates game context',
      0.8
    ))

    // Instruction clarity
    const instructionClarity = this.evaluateInstructionClarity(hintPrompt)
    metrics.push(this.createMetric(
      'instruction_clarity',
      instructionClarity,
      'Clarity of hint generation instructions',
      0.9
    ))

    return metrics
  }

  // ========== HELPER METHODS ==========

  private buildHintPrompt(scenario: HintTestScenario): string {
    // Simulate the hint prompt building logic from get-hint function
    let conversationSummary = `[HINT GENERATION CONTEXT:
- Total questions asked: ${scenario.questionsAsked}
- Previous hints given: ${scenario.hintsUsed}
- Current progress: Question #${scenario.questionsAsked + 1} of 20

ESTABLISHED FACTS - DO NOT REPEAT THIS INFORMATION IN HINT:`

    // Add confirmed facts
    if (scenario.establishedFacts.confirmed_yes.length > 0) {
      conversationSummary += `\n\nCONFIRMED TRUE (Player knows the item IS these things):`
      scenario.establishedFacts.confirmed_yes.forEach(fact => {
        conversationSummary += `\n  ✓ ${fact.question} (Player already knows this - confidence: ${Math.round(fact.confidence * 100)}%)`
      })
    }

    if (scenario.establishedFacts.confirmed_no.length > 0) {
      conversationSummary += `\n\nCONFIRMED FALSE (Player knows the item is NOT these things):`
      scenario.establishedFacts.confirmed_no.forEach(fact => {
        conversationSummary += `\n  ✗ ${fact.question} (Player already knows this - confidence: ${Math.round(fact.confidence * 100)}%)`
      })
    }

    // Add previous hints
    if (scenario.previousHints.length > 0) {
      conversationSummary += `\n\nPREVIOUS HINTS ALREADY GIVEN (DO NOT REPEAT):`
      scenario.previousHints.forEach((hint, index) => {
        conversationSummary += `\n  Hint #${index + 1}: "${hint}"`
      })
    }

    conversationSummary += `\n\n🚨 CRITICAL INSTRUCTION: Your hint MUST provide NEW information that the player doesn't already know from the established facts above.]`

    return conversationSummary
  }

  private simulateHintGeneration(scenario: HintTestScenario): string {
    // Simulate different hint types based on game stage and secret item
    const gameStage = this.determineGameStage(scenario.questionsAsked, scenario.hintsUsed)
    
    switch (gameStage) {
      case 'early':
        return this.generateEarlyGameHint(scenario.secretItem, scenario.category)
      case 'mid':
        return this.generateMidGameHint(scenario.secretItem, scenario.establishedFacts)
      case 'late':
        return this.generateLateGameHint(scenario.secretItem, scenario.establishedFacts)
      case 'very_late':
        return this.generateVeryLateGameHint(scenario.secretItem, scenario.establishedFacts)
      default:
        return this.generateGenericHint(scenario.secretItem)
    }
  }

  private determineGameStage(questionsAsked: number, hintsUsed: number): string {
    if (questionsAsked < 5) return 'early'
    if (questionsAsked < 10) return 'mid'
    if (questionsAsked < 15) return 'late'
    return 'very_late'
  }

  private generateEarlyGameHint(secretItem: string, category: string): string {
    // Simulate early game hints - broad characteristics
    const earlyHints: Record<string, string> = {
      'lion': 'This creature is known for its distinctive mane and powerful roar.',
      'smartphone': 'This object has become essential for modern communication.',
      'winston churchill': 'This leader is famous for wartime speeches and a distinctive appearance.'
    }
    return earlyHints[secretItem.toLowerCase()] || 'This item has a distinctive characteristic that sets it apart.'
  }

  private generateMidGameHint(secretItem: string, facts: any): string {
    return 'This item is often associated with specific environments or contexts.'
  }

  private generateLateGameHint(secretItem: string, facts: any): string {
    return 'This item has a very specific function or role that distinguishes it from similar items.'
  }

  private generateVeryLateGameHint(secretItem: string, facts: any): string {
    return 'Think about the most famous or iconic example of this type of item.'
  }

  private generateGenericHint(secretItem: string): string {
    return 'This item has characteristics that would be familiar to most people.'
  }

  private evaluateHintLength(hint: string, hintsUsed: number): number {
    const idealLengths = {
      early: { min: 30, max: 100, ideal: 60 },
      mid: { min: 40, max: 120, ideal: 80 },
      late: { min: 50, max: 150, ideal: 100 },
      very_late: { min: 60, max: 200, ideal: 120 }
    }

    const stage = hintsUsed <= 1 ? 'early' : hintsUsed <= 2 ? 'mid' : hintsUsed <= 3 ? 'late' : 'very_late'
    const target = idealLengths[stage]
    
    const length = hint.length
    
    if (length < target.min) return length / target.min
    if (length > target.max) return target.max / length
    
    const deviation = Math.abs(length - target.ideal) / target.ideal
    return Math.exp(-deviation * deviation)
  }

  private evaluateHintClarity(hint: string): number {
    // Check for clear, understandable language
    let score = 0.5

    // Positive indicators
    const clarityIndicators = [
      /this.*is.*known.*for/i,
      /this.*item.*has/i,
      /you.*might.*find/i,
      /typically.*used/i,
      /often.*associated/i
    ]

    score += clarityIndicators.filter(indicator => indicator.test(hint)).length * 0.15

    // Negative indicators (confusing language)
    const confusingIndicators = [
      /perhaps.*maybe/i,
      /might.*could.*possibly/i,
      /unclear.*ambiguous/i
    ]

    score -= confusingIndicators.filter(indicator => indicator.test(hint)).length * 0.2

    return Math.max(0, Math.min(1, score))
  }

  private evaluateHintActionability(hint: string): number {
    // Check if hint provides actionable information for next questions
    const actionableIndicators = [
      /think.*about/i,
      /consider.*the/i,
      /focus.*on/i,
      /look.*for/i,
      /associated.*with/i,
      /found.*in/i,
      /used.*for/i,
      /known.*for/i
    ]

    const presentIndicators = actionableIndicators.filter(indicator => indicator.test(hint))
    return presentIndicators.length / actionableIndicators.length
  }

  private evaluateHintHelpfulness(hint: string, secretItem: string): number {
    // Check if hint contains relevant information about the secret item
    const itemKeywords = this.extractItemKeywords(secretItem)
    
    // Count relevant keywords mentioned (indirectly)
    let relevantMentions = 0
    for (const keyword of itemKeywords) {
      if (hint.toLowerCase().includes(keyword)) {
        relevantMentions++
      }
    }

    // Balance relevance with subtlety
    const relevanceScore = Math.min(0.7, relevantMentions / Math.max(1, itemKeywords.length))
    
    // Check for helpful descriptive language
    const descriptiveScore = this.evaluateDescriptiveLanguage(hint)
    
    return relevanceScore * 0.6 + descriptiveScore * 0.4
  }

  private calculateHintNovelty(
    hint: string, 
    establishedFacts: HintTestScenario['establishedFacts'], 
    previousHints: string[]
  ): number {
    // Calculate what percentage of hint content is new information
    const hintWords = new Set(hint.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    
    // Extract words from established facts
    const factWords = new Set<string>()
    establishedFacts.confirmed_yes.forEach(fact => {
      fact.question.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => factWords.add(w))
    })
    establishedFacts.confirmed_no.forEach(fact => {
      fact.question.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => factWords.add(w))
    })

    // Extract words from previous hints
    const hintWords_prev = new Set<string>()
    previousHints.forEach(prevHint => {
      prevHint.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => hintWords_prev.add(w))
    })

    // Calculate novelty
    const knownWords = new Set([...factWords, ...hintWords_prev])
    const newWords = new Set([...hintWords].filter(w => !knownWords.has(w)))
    
    return hintWords.size > 0 ? newWords.size / hintWords.size : 0
  }

  private calculateHintRepetitionAvoidance(hint: string, previousHints: string[]): number {
    if (previousHints.length === 0) return 1

    const currentHint = hint.toLowerCase()
    let maxSimilarity = 0

    for (const prevHint of previousHints) {
      const similarity = this.calculateJaccardSimilarity(
        currentHint.split(/\s+/),
        prevHint.toLowerCase().split(/\s+/)
      )
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }

    return 1 - maxSimilarity
  }

  private calculateFactOverlapMinimization(hint: string, establishedFacts: HintTestScenario['establishedFacts']): number {
    const hintLower = hint.toLowerCase()
    
    let factOverlaps = 0
    let totalFacts = 0

    // Check overlaps with confirmed facts
    establishedFacts.confirmed_yes.forEach(fact => {
      totalFacts++
      const factKeywords = fact.question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const hasOverlap = factKeywords.some(keyword => hintLower.includes(keyword))
      if (hasOverlap) factOverlaps++
    })

    establishedFacts.confirmed_no.forEach(fact => {
      totalFacts++
      const factKeywords = fact.question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const hasOverlap = factKeywords.some(keyword => hintLower.includes(keyword))
      if (hasOverlap) factOverlaps++
    })

    return totalFacts > 0 ? 1 - (factOverlaps / totalFacts) : 1
  }

  private evaluateFactConsistency(
    hint: string, 
    establishedFacts: HintTestScenario['establishedFacts'], 
    secretItem: string
  ): number {
    // Check if hint is consistent with confirmed facts
    let consistencyScore = 1.0

    // Check for contradictions with confirmed YES facts
    for (const fact of establishedFacts.confirmed_yes) {
      if (this.isContradictoryToYesFact(hint, fact.question, secretItem)) {
        consistencyScore -= 0.3
      }
    }

    // Check for contradictions with confirmed NO facts
    for (const fact of establishedFacts.confirmed_no) {
      if (this.isContradictoryToNoFact(hint, fact.question, secretItem)) {
        consistencyScore -= 0.3
      }
    }

    return Math.max(0, consistencyScore)
  }

  private evaluateCategoryConsistency(hint: string, category: string, secretItem: string): number {
    // Verify hint is appropriate for the category
    const categoryTerms = this.getCategoryAppropriateTerms(category)
    const inappropriateTerms = this.getCategoryInappropriateTerms(category)

    let score = 0.5

    // Positive score for appropriate terms
    const appropriateTermsFound = categoryTerms.filter(term => 
      hint.toLowerCase().includes(term)
    ).length
    if (categoryTerms.length > 0) {
      score += (appropriateTermsFound / categoryTerms.length) * 0.3
    }

    // Negative score for inappropriate terms
    const inappropriateTermsFound = inappropriateTerms.filter(term => 
      hint.toLowerCase().includes(term)
    ).length
    if (inappropriateTerms.length > 0) {
      score -= (inappropriateTermsFound / inappropriateTerms.length) * 0.4
    }

    return Math.max(0, Math.min(1, score))
  }

  private evaluateStageConsistency(hint: string, questionsAsked: number, hintsUsed: number): number {
    const stage = this.determineGameStage(questionsAsked, hintsUsed)
    
    const stageIndicators: Record<string, string[]> = {
      early: ['characteristic', 'feature', 'known for', 'distinctive'],
      mid: ['context', 'environment', 'associated', 'typically'],
      late: ['specific', 'function', 'role', 'purpose'],
      very_late: ['famous', 'iconic', 'most well-known', 'primary example']
    }

    const expectedIndicators = stageIndicators[stage] || []
    const foundIndicators = expectedIndicators.filter(indicator => 
      hint.toLowerCase().includes(indicator)
    )

    return expectedIndicators.length > 0 ? foundIndicators.length / expectedIndicators.length : 0.5
  }

  private evaluateDirectAnswerAvoidance(hint: string, secretItem: string): number {
    const hintLower = hint.toLowerCase()
    const itemLower = secretItem.toLowerCase()
    
    // Check if hint directly mentions the answer
    if (hintLower.includes(itemLower)) return 0
    
    // Check for direct word matches
    const itemWords = itemLower.split(/\s+/)
    const directMatches = itemWords.filter(word => 
      word.length > 3 && hintLower.includes(word)
    )

    if (directMatches.length > 0) {
      return Math.max(0, 1 - (directMatches.length / itemWords.length))
    }

    return 1
  }

  private evaluateObviousClueAvoidance(hint: string, secretItem: string): number {
    // Check for overly obvious clues that make it too easy
    const obviousPatterns = this.getObviousCluePatterns(secretItem)
    
    const obviousCluesFound = obviousPatterns.filter(pattern => 
      new RegExp(pattern, 'i').test(hint)
    )

    return obviousPatterns.length > 0 ? 1 - (obviousCluesFound.length / obviousPatterns.length) : 1
  }

  private evaluateHintSubtlety(hint: string, secretItem: string): number {
    // Balance between helpful and subtle
    const subtletyIndicators = [
      'often', 'sometimes', 'might', 'could', 'typically',
      'associated with', 'related to', 'connected to'
    ]

    const directIndicators = [
      'always', 'definitely', 'certainly', 'exactly', 'specifically'
    ]

    const subtleScore = subtletyIndicators.filter(indicator => 
      hint.toLowerCase().includes(indicator)
    ).length / subtletyIndicators.length

    const directScore = directIndicators.filter(indicator => 
      hint.toLowerCase().includes(indicator)
    ).length / directIndicators.length

    return subtleScore * 0.7 + (1 - directScore) * 0.3
  }

  private calculateDisclosureLevel(hint: string, secretItem: string): number {
    // Calculate how much the hint reveals (0 = nothing, 1 = everything)
    const itemKeywords = this.extractItemKeywords(secretItem)
    const hintKeywords = hint.toLowerCase().split(/\s+/)
    
    const relevantKeywords = itemKeywords.filter(keyword => 
      hintKeywords.includes(keyword.toLowerCase())
    )

    return relevantKeywords.length / Math.max(1, itemKeywords.length)
  }

  private evaluateDisclosureAppropriateness(
    disclosureLevel: number, 
    questionsAsked: number, 
    hintsUsed: number
  ): number {
    // Calculate appropriate disclosure level for current game state
    const gameProgress = questionsAsked / 20
    const hintProgress = hintsUsed / 3 // Assuming max 3 hints
    
    const appropriateDisclosure = Math.max(
      0.1 + gameProgress * 0.3, // Base on questions asked
      0.2 + hintProgress * 0.4   // Base on hints used
    )

    // Score based on how close actual disclosure is to appropriate level
    const deviation = Math.abs(disclosureLevel - appropriateDisclosure)
    return Math.exp(-deviation * 5) // Exponential penalty for deviation
  }

  private evaluateHintEscalation(hint: string, previousHints: string[], hintsUsed: number): number {
    if (previousHints.length === 0) return 1

    // Check if current hint provides more specific information than previous
    const currentSpecificity = this.calculateHintSpecificity(hint)
    const avgPreviousSpecificity = previousHints.reduce((sum, prevHint) => 
      sum + this.calculateHintSpecificity(prevHint), 0
    ) / previousHints.length

    // Expect gradual increase in specificity
    const expectedEscalation = hintsUsed * 0.2 // 20% increase per hint
    const actualEscalation = currentSpecificity - avgPreviousSpecificity

    return Math.min(1, Math.max(0, 1 - Math.abs(actualEscalation - expectedEscalation)))
  }

  private calculateHintSpecificity(hint: string): number {
    const specificityIndicators = [
      'specific', 'particular', 'distinctive', 'unique', 'special',
      'famous', 'well-known', 'primary', 'main', 'chief'
    ]

    const generalIndicators = [
      'general', 'common', 'typical', 'usual', 'normal',
      'often', 'sometimes', 'might', 'could'
    ]

    const specificCount = specificityIndicators.filter(indicator => 
      hint.toLowerCase().includes(indicator)
    ).length

    const generalCount = generalIndicators.filter(indicator => 
      hint.toLowerCase().includes(indicator)
    ).length

    const totalIndicators = specificCount + generalCount
    if (totalIndicators === 0) return 0.5

    return specificCount / totalIndicators
  }

  private evaluateHintPromptStructure(hintPrompt: string): number {
    const requiredSections = [
      'HINT GENERATION CONTEXT',
      'ESTABLISHED FACTS',
      'DO NOT REPEAT',
      'CRITICAL INSTRUCTION',
      'NEW information'
    ]

    const presentSections = requiredSections.filter(section => 
      hintPrompt.toUpperCase().includes(section.toUpperCase())
    )

    return presentSections.length / requiredSections.length
  }

  private evaluateContextIntegration(hintPrompt: string, scenario: HintTestScenario): number {
    let score = 0

    // Check if game state is included
    if (hintPrompt.includes(`${scenario.questionsAsked}`)) score += 0.3
    if (hintPrompt.includes(`${scenario.hintsUsed}`)) score += 0.3

    // Check if established facts are listed
    if (scenario.establishedFacts.confirmed_yes.length > 0) {
      const factsListed = scenario.establishedFacts.confirmed_yes.filter(fact => 
        hintPrompt.includes(fact.question)
      ).length
      score += (factsListed / scenario.establishedFacts.confirmed_yes.length) * 0.2
    } else {
      score += 0.2
    }

    // Check if previous hints are listed
    if (scenario.previousHints.length > 0) {
      const hintsListed = scenario.previousHints.filter(hint => 
        hintPrompt.includes(hint)
      ).length
      score += (hintsListed / scenario.previousHints.length) * 0.2
    } else {
      score += 0.2
    }

    return Math.min(1, score)
  }

  private evaluateInstructionClarity(hintPrompt: string): number {
    const clarityIndicators = [
      'must provide new',
      'do not repeat',
      'focus on.*unexplored',
      'completely new information',
      'avoid.*what.*already.*know'
    ]

    const presentIndicators = clarityIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(hintPrompt)
    )

    return presentIndicators.length / clarityIndicators.length
  }

  private evaluateDescriptiveLanguage(hint: string): number {
    const descriptiveWords = [
      'distinctive', 'characteristic', 'feature', 'property', 
      'aspect', 'quality', 'trait', 'attribute'
    ]

    const foundDescriptive = descriptiveWords.filter(word => 
      hint.toLowerCase().includes(word)
    )

    return Math.min(1, foundDescriptive.length / 3) // Expect at least 3 for good description
  }

  private extractItemKeywords(secretItem: string): string[] {
    // Extract relevant keywords for the secret item
    const itemKeywordMap: Record<string, string[]> = {
      'lion': ['mane', 'roar', 'pride', 'africa', 'savanna', 'cat', 'predator'],
      'smartphone': ['screen', 'apps', 'touch', 'communication', 'portable', 'digital'],
      'winston churchill': ['britain', 'war', 'speeches', 'cigar', 'prime minister', 'bulldog']
    }

    return itemKeywordMap[secretItem.toLowerCase()] || secretItem.toLowerCase().split(/\s+/)
  }

  private getCategoryAppropriateTerms(category: string): string[] {
    const terms: Record<string, string[]> = {
      'animals': ['creature', 'animal', 'habitat', 'behavior', 'species'],
      'objects': ['item', 'object', 'tool', 'device', 'material'],
      'world leaders': ['leader', 'political', 'government', 'country', 'office'],
      'cricket players': ['player', 'cricket', 'sport', 'team', 'game'],
      'football players': ['player', 'football', 'sport', 'team', 'position'],
      'nba players': ['player', 'basketball', 'sport', 'team', 'court']
    }
    return terms[category.toLowerCase()] || []
  }

  private getCategoryInappropriateTerms(category: string): string[] {
    const terms: Record<string, string[]> = {
      'animals': ['electronic', 'plastic', 'digital', 'manufactured'],
      'objects': ['alive', 'breathing', 'biological', 'living'],
      'world leaders': ['electronic', 'material', 'manufactured', 'portable'],
      'cricket players': ['electronic', 'plastic', 'manufactured', 'portable'],
      'football players': ['electronic', 'plastic', 'manufactured', 'portable'],
      'nba players': ['electronic', 'plastic', 'manufactured', 'portable']
    }
    return terms[category.toLowerCase()] || []
  }

  private getObviousCluePatterns(secretItem: string): string[] {
    // Patterns that would make the answer too obvious
    const obviousClues: Record<string, string[]> = {
      'lion': ['king.*jungle', 'mane.*male', 'roars.*loudly'],
      'smartphone': ['iphone.*android', 'calls.*texts', 'apps.*store'],
      'winston churchill': ['world.*war.*two', 'british.*prime.*minister', 'bulldog.*cigar']
    }

    return obviousClues[secretItem.toLowerCase()] || []
  }

  private isContradictoryToYesFact(hint: string, factQuestion: string, secretItem: string): boolean {
    // Check if hint contradicts a confirmed YES fact
    // This would require domain knowledge about the secret item
    return false // Simplified for now - could be enhanced with knowledge base
  }

  private isContradictoryToNoFact(hint: string, factQuestion: string, secretItem: string): boolean {
    // Check if hint contradicts a confirmed NO fact
    return false // Simplified for now
  }
}