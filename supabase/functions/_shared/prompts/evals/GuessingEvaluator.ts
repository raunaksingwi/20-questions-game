/**
 * Evaluator for AI Guessing Prompt Builder functionality.
 * Measures fact categorization, deduction quality, and domain narrowing effectiveness.
 */

import { BaseEvaluator, EvaluationMetric, TestScenario } from './BaseEvaluator.ts'
import { AIGuessingPromptBuilder, FactsByAnswer } from '../AIGuessingPromptBuilder.ts'

export interface GuessingTestScenario extends TestScenario {
  category: string
  questionsByNumber: Record<number, string>
  answersByNumber: Record<number, string>
  allAskedQuestions: string[]
  currentQuestionNumber: number
  expectedFactCategorization?: FactsByAnswer
  expectedDeductions?: string[]
}

export class GuessingEvaluator extends BaseEvaluator {
  constructor() {
    super('GuessingEvaluator', 'ai_guessing_prompt_builder')
  }

  /**
   * Collects comprehensive metrics for guessing prompt builder evaluation
   */
  protected async collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]> {
    const testScenario = scenario as GuessingTestScenario
    const metrics: EvaluationMetric[] = []

    // Test fact categorization
    const facts = AIGuessingPromptBuilder.categorizeFacts(
      testScenario.questionsByNumber,
      testScenario.answersByNumber
    )
    
    metrics.push(...this.evaluateFactCategorization(facts, testScenario))
    
    // Test categorized summary building
    const categorizedSummary = AIGuessingPromptBuilder.buildCategorizedSummary(facts)
    metrics.push(...this.evaluateCategorizedSummary(categorizedSummary, facts))
    
    // Test logical deductions
    const logicalDeductions = AIGuessingPromptBuilder.buildLogicalDeductions(testScenario.category, facts)
    metrics.push(...this.evaluateLogicalDeductions(logicalDeductions, testScenario.category, facts))
    
    // Test repetition prevention
    const repetitionPrevention = AIGuessingPromptBuilder.buildRepetitionPrevention(testScenario.allAskedQuestions)
    metrics.push(...this.evaluateRepetitionPrevention(repetitionPrevention, testScenario.allAskedQuestions))
    
    // Test domain narrowing analysis
    const domainAnalysis = AIGuessingPromptBuilder.buildDomainNarrowingAnalysis(facts)
    metrics.push(...this.evaluateDomainNarrowingAnalysis(domainAnalysis, facts))
    
    // Test category constraints
    const categoryConstraints = AIGuessingPromptBuilder.buildCategoryConstraints(testScenario.category)
    metrics.push(...this.evaluateCategoryConstraints(categoryConstraints, testScenario.category))
    
    // Test complete enhanced system prompt
    const basePrompt = "Base system prompt for testing"
    const enhancedPrompt = AIGuessingPromptBuilder.buildEnhancedSystemPrompt(
      basePrompt,
      testScenario.category,
      facts,
      testScenario.allAskedQuestions,
      testScenario.currentQuestionNumber
    )
    metrics.push(...this.evaluateEnhancedSystemPrompt(enhancedPrompt, testScenario))

    return metrics
  }

  /**
   * Evaluates accuracy of fact categorization logic
   */
  private evaluateFactCategorization(facts: FactsByAnswer, scenario: GuessingTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Test answer classification accuracy
    const classificationAccuracy = this.calculateClassificationAccuracy(
      scenario.questionsByNumber,
      scenario.answersByNumber,
      facts
    )
    
    metrics.push(this.createMetric(
      'answer_classification_accuracy',
      classificationAccuracy,
      'Accuracy of yes/no/maybe/unknown answer classification',
      0.95
    ))

    // Test fact distribution balance
    const distributionBalance = this.calculateFactDistributionBalance(facts)
    metrics.push(this.createMetric(
      'fact_distribution_balance',
      distributionBalance,
      'How well facts are distributed across categories',
      0.3
    ))

    // Test edge case handling
    const edgeCaseHandling = this.evaluateAnswerEdgeCases(
      scenario.answersByNumber,
      facts
    )
    metrics.push(this.createMetric(
      'edge_case_handling',
      edgeCaseHandling,
      'How well categorization handles edge case answers',
      0.8
    ))

    return metrics
  }

  /**
   * Evaluates quality of categorized summary generation
   */
  private evaluateCategorizedSummary(summary: string, facts: FactsByAnswer): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Summary completeness
    const completeness = this.evaluateSummaryCompleteness(summary, facts)
    metrics.push(this.createMetric(
      'summary_completeness',
      completeness,
      'How completely summary covers all fact categories',
      0.9
    ))

    // Visual organization quality
    const visualOrganization = this.evaluateVisualOrganization(summary)
    metrics.push(this.createMetric(
      'visual_organization',
      visualOrganization,
      'Quality of visual organization with symbols and formatting',
      0.8
    ))

    // Fact preservation accuracy
    const factPreservation = this.evaluateFactPreservation(summary, facts)
    metrics.push(this.createMetric(
      'fact_preservation_accuracy',
      factPreservation,
      'How accurately facts are preserved in summary',
      0.95
    ))

    return metrics
  }

  /**
   * Evaluates logical deduction quality and accuracy
   */
  private evaluateLogicalDeductions(deductions: string, category: string, facts: FactsByAnswer): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Deduction logic accuracy
    const logicAccuracy = this.evaluateDeductionLogic(deductions, category, facts)
    metrics.push(this.createMetric(
      'deduction_logic_accuracy',
      logicAccuracy,
      'Accuracy of logical deduction rules applied',
      0.9
    ))

    // Category-specific deduction coverage
    const categoryDeductionCoverage = this.evaluateCategoryDeductionCoverage(deductions, category)
    metrics.push(this.createMetric(
      'category_deduction_coverage',
      categoryDeductionCoverage,
      'Coverage of category-specific logical deductions',
      0.7
    ))

    // Deduction helpfulness
    const deductionHelpfulness = this.evaluateDeductionHelpfulness(deductions, facts)
    metrics.push(this.createMetric(
      'deduction_helpfulness',
      deductionHelpfulness,
      'How helpful deductions are for narrowing possibilities',
      0.6
    ))

    return metrics
  }

  /**
   * Evaluates repetition prevention mechanism effectiveness
   */
  private evaluateRepetitionPrevention(prevention: string, askedQuestions: string[]): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Question listing accuracy
    const listingAccuracy = this.evaluateQuestionListingAccuracy(prevention, askedQuestions)
    metrics.push(this.createMetric(
      'question_listing_accuracy',
      listingAccuracy,
      'Accuracy of already-asked question listing',
      0.95
    ))

    // Semantic category extraction
    const semanticExtraction = this.evaluateSemanticCategoryExtraction(prevention, askedQuestions)
    metrics.push(this.createMetric(
      'semantic_category_extraction',
      semanticExtraction,
      'Quality of semantic category identification',
      0.7
    ))

    // Prevention effectiveness
    const preventionEffectiveness = this.evaluatePreventionInstructions(prevention)
    metrics.push(this.createMetric(
      'prevention_effectiveness',
      preventionEffectiveness,
      'Strength and clarity of repetition prevention instructions',
      0.8
    ))

    return metrics
  }

  /**
   * Evaluates domain narrowing analysis quality
   */
  private evaluateDomainNarrowingAnalysis(analysis: string, facts: FactsByAnswer): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Analysis depth and quality
    const analysisDepth = this.evaluateAnalysisDepth(analysis)
    metrics.push(this.createMetric(
      'domain_analysis_depth',
      analysisDepth,
      'Depth and quality of domain narrowing analysis',
      0.7
    ))

    // Practical guidance quality
    const practicalGuidance = this.evaluatePracticalGuidance(analysis)
    metrics.push(this.createMetric(
      'practical_guidance_quality',
      practicalGuidance,
      'Quality of practical next-question guidance',
      0.8
    ))

    // Domain violation prevention
    const violationPrevention = this.evaluateDomainViolationPrevention(analysis)
    metrics.push(this.createMetric(
      'domain_violation_prevention',
      violationPrevention,
      'Effectiveness of domain violation prevention examples',
      0.9
    ))

    return metrics
  }

  /**
   * Evaluates category constraint enforcement
   */
  private evaluateCategoryConstraints(constraints: string, category: string): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Constraint completeness for category
    const constraintCompleteness = this.evaluateConstraintCompleteness(constraints, category)
    metrics.push(this.createMetric(
      'constraint_completeness',
      constraintCompleteness,
      'Completeness of category-specific constraints',
      0.9
    ))

    // Forbidden question coverage
    const forbiddenCoverage = this.evaluateForbiddenQuestionCoverage(constraints, category)
    metrics.push(this.createMetric(
      'forbidden_question_coverage',
      forbiddenCoverage,
      'Coverage of forbidden questions for category',
      0.8
    ))

    // Appropriate question promotion
    const appropriatePromotion = this.evaluateAppropriateQuestionPromotion(constraints, category)
    metrics.push(this.createMetric(
      'appropriate_question_promotion',
      appropriatePromotion,
      'Quality of appropriate question examples',
      0.8
    ))

    return metrics
  }

  /**
   * Evaluates the complete enhanced system prompt
   */
  private evaluateEnhancedSystemPrompt(prompt: string, scenario: GuessingTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Overall prompt coherence
    const coherence = this.measureSemanticCoherence(prompt)
    metrics.push(this.createMetric(
      'enhanced_prompt_coherence',
      coherence,
      'Overall coherence of enhanced system prompt',
      0.7
    ))

    // Section integration quality
    const integration = this.evaluateSectionIntegration(prompt)
    metrics.push(this.createMetric(
      'section_integration_quality',
      integration,
      'How well different sections integrate together',
      0.8
    ))

    // Actionability score
    const actionability = this.evaluateActionability(prompt)
    metrics.push(this.createMetric(
      'prompt_actionability',
      actionability,
      'How actionable and clear the prompt instructions are',
      0.8
    ))

    return metrics
  }

  // ========== HELPER METHODS ==========

  private calculateClassificationAccuracy(
    questions: Record<number, string>,
    answers: Record<number, string>,
    facts: FactsByAnswer
  ): number {
    let correctClassifications = 0
    let totalClassifications = 0

    for (const [qNum, answer] of Object.entries(answers)) {
      const normalizedAnswer = answer.toLowerCase().trim()
      let expectedCategory: keyof FactsByAnswer | null = null
      
      // Determine expected category
      if (this.isYesAnswer(normalizedAnswer)) expectedCategory = 'yesFacts'
      else if (this.isNoAnswer(normalizedAnswer)) expectedCategory = 'noFacts'
      else if (this.isMaybeAnswer(normalizedAnswer)) expectedCategory = 'maybeFacts'
      else if (this.isDontKnowAnswer(normalizedAnswer)) expectedCategory = 'unknownFacts'
      
      if (expectedCategory) {
        totalClassifications++
        const questionNum = Number(qNum)
        const isCorrectlyClassified = facts[expectedCategory].some(fact => fact.n === questionNum)
        if (isCorrectlyClassified) correctClassifications++
      }
    }

    return totalClassifications > 0 ? correctClassifications / totalClassifications : 1
  }

  private calculateFactDistributionBalance(facts: FactsByAnswer): number {
    const totalFacts = facts.yesFacts.length + facts.noFacts.length + facts.maybeFacts.length + facts.unknownFacts.length
    if (totalFacts === 0) return 1

    // Calculate entropy of distribution
    const categories = [facts.yesFacts.length, facts.noFacts.length, facts.maybeFacts.length, facts.unknownFacts.length]
    const probabilities = categories.map(count => count / totalFacts).filter(p => p > 0)
    
    if (probabilities.length <= 1) return 0
    
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0)
    const maxEntropy = Math.log2(probabilities.length)
    
    return entropy / maxEntropy
  }

  private evaluateAnswerEdgeCases(answers: Record<number, string>, facts: FactsByAnswer): number {
    let edgeCasesHandled = 0
    let totalEdgeCases = 0

    // Test edge case patterns
    const edgeCaseAnswers = [
      'maybe sometimes', 'i don\'t know', 'kind of', 'not really', 
      'sort of', 'it depends', 'sometimes yes', 'partially'
    ]

    for (const [qNum, answer] of Object.entries(answers)) {
      const lowerAnswer = answer.toLowerCase()
      const isEdgeCase = edgeCaseAnswers.some(edge => lowerAnswer.includes(edge))
      
      if (isEdgeCase) {
        totalEdgeCases++
        const questionNum = Number(qNum)
        
        // Check if it was properly categorized (maybe or unknown)
        const isProperlyHandled = 
          facts.maybeFacts.some(f => f.n === questionNum) ||
          facts.unknownFacts.some(f => f.n === questionNum)
        
        if (isProperlyHandled) edgeCasesHandled++
      }
    }

    return totalEdgeCases > 0 ? edgeCasesHandled / totalEdgeCases : 1
  }

  private evaluateSummaryCompleteness(summary: string, facts: FactsByAnswer): number {
    let sectionsPresent = 0
    const totalSections = 4 // yes, no, maybe, unknown

    if (facts.yesFacts.length > 0) {
      sectionsPresent += summary.includes('CONFIRMED TRUE') ? 1 : 0
    } else {
      sectionsPresent += 1 // No section needed
    }

    if (facts.noFacts.length > 0) {
      sectionsPresent += summary.includes('CONFIRMED FALSE') ? 1 : 0
    } else {
      sectionsPresent += 1
    }

    if (facts.maybeFacts.length > 0) {
      sectionsPresent += summary.includes('PARTIAL YES') ? 1 : 0
    } else {
      sectionsPresent += 1
    }

    if (facts.unknownFacts.length > 0) {
      sectionsPresent += summary.includes('UNKNOWN') ? 1 : 0
    } else {
      sectionsPresent += 1
    }

    return sectionsPresent / totalSections
  }

  private evaluateVisualOrganization(summary: string): number {
    let score = 0
    
    // Check for visual indicators
    const visualElements = ['✓', '✗', '~', '?', '→']
    const presentElements = visualElements.filter(element => summary.includes(element))
    score += (presentElements.length / visualElements.length) * 0.4

    // Check for clear section headers
    const hasHeaders = /[A-Z\s]+\(/g.test(summary)
    if (hasHeaders) score += 0.3

    // Check for consistent formatting
    const hasConsistentBullets = summary.split('\n').filter(line => 
      line.trim().startsWith('→') || line.trim().startsWith('•')
    ).length > 0
    if (hasConsistentBullets) score += 0.3

    return Math.min(1, score)
  }

  private evaluateFactPreservation(summary: string, facts: FactsByAnswer): number {
    let preservedFacts = 0
    let totalFacts = 0

    // Check yes facts preservation
    for (const fact of facts.yesFacts) {
      totalFacts++
      if (summary.includes(fact.q)) preservedFacts++
    }

    // Check no facts preservation
    for (const fact of facts.noFacts) {
      totalFacts++
      if (summary.includes(fact.q)) preservedFacts++
    }

    // Check maybe facts preservation
    for (const fact of facts.maybeFacts) {
      totalFacts++
      if (summary.includes(fact.q)) preservedFacts++
    }

    // Check unknown facts preservation
    for (const fact of facts.unknownFacts) {
      totalFacts++
      if (summary.includes(fact.q)) preservedFacts++
    }

    return totalFacts > 0 ? preservedFacts / totalFacts : 1
  }

  private evaluateDeductionLogic(deductions: string, category: string, facts: FactsByAnswer): number {
    // Verify logical consistency of deductions
    let validDeductions = 0
    let totalDeductions = 0

    // Category-specific deduction validation
    const categoryDeductionRules: Record<string, Array<{ condition: string, conclusion: string }>> = {
      'animals': [
        { condition: 'mammal.*yes', conclusion: 'not.*bird.*reptile.*fish' },
        { condition: 'wild.*yes', conclusion: 'not.*domestic.*pet' },
        { condition: 'carnivore.*yes', conclusion: 'eats.*meat' }
      ],
      'objects': [
        { condition: 'electronic.*yes', conclusion: 'not.*living.*organic' },
        { condition: 'handheld.*yes', conclusion: 'portable.*small' },
        { condition: 'furniture.*yes', conclusion: 'not.*handheld' }
      ],
      'world leaders': [
        { condition: 'alive.*yes', conclusion: 'not.*historical' },
        { condition: 'president.*yes', conclusion: 'not.*monarch.*pm' },
        { condition: 'europe.*yes', conclusion: 'not.*asia.*africa' }
      ]
    }

    const rules = categoryDeductionRules[category.toLowerCase()] || []
    
    for (const rule of rules) {
      totalDeductions++
      
      // Check if condition exists in facts and conclusion in deductions
      const hasCondition = this.checkFactCondition(facts, rule.condition)
      if (hasCondition) {
        const hasValidConclusion = new RegExp(rule.conclusion, 'i').test(deductions)
        if (hasValidConclusion) validDeductions++
      } else {
        validDeductions++ // Rule doesn't apply, so it's not wrong
      }
    }

    return totalDeductions > 0 ? validDeductions / totalDeductions : 1
  }

  private evaluateCategoryDeductionCoverage(deductions: string, category: string): number {
    const categoryExpectedDeductions: Record<string, string[]> = {
      'animals': ['mammal', 'wild', 'carnivore', 'size', 'habitat'],
      'objects': ['electronic', 'handheld', 'material', 'location', 'function'],
      'world leaders': ['alive', 'geography', 'role', 'era', 'democracy'],
      'cricket players': ['active', 'nationality', 'role', 'achievement'],
      'football players': ['active', 'position', 'achievement', 'conference'],
      'nba players': ['active', 'position', 'achievement', 'conference']
    }

    const expectedTerms = categoryExpectedDeductions[category.toLowerCase()] || []
    if (expectedTerms.length === 0) return 1

    const coveredTerms = expectedTerms.filter(term => 
      deductions.toLowerCase().includes(term)
    )

    return coveredTerms.length / expectedTerms.length
  }

  private evaluateDeductionHelpfulness(deductions: string, facts: FactsByAnswer): number {
    // Measure how much deductions help narrow the search space
    const totalFacts = facts.yesFacts.length + facts.noFacts.length + facts.maybeFacts.length

    if (totalFacts === 0) return 0

    // Count logical implications mentioned
    const implicationPatterns = [
      'it\'s not', 'not.*being', 'eliminates', 'rules out', 
      'therefore', 'this means', 'consequently'
    ]

    const implications = implicationPatterns.filter(pattern => 
      new RegExp(pattern, 'i').test(deductions)
    ).length

    // Normalize based on available facts to deduce from
    return Math.min(1, implications / Math.max(1, totalFacts * 0.5))
  }

  private evaluateQuestionListingAccuracy(prevention: string, askedQuestions: string[]): number {
    if (askedQuestions.length === 0) return 1

    let listedQuestions = 0
    for (const question of askedQuestions) {
      if (prevention.includes(question)) {
        listedQuestions++
      }
    }

    return listedQuestions / askedQuestions.length
  }

  private evaluateSemanticCategoryExtraction(prevention: string, askedQuestions: string[]): number {
    // Check if semantic categories are identified
    const hasSemanticSection = /SEMANTIC CATEGORIES.*EXPLORED/i.test(prevention)
    if (!hasSemanticSection && askedQuestions.length < 3) return 1 // Not needed for few questions

    // Evaluate quality of semantic categorization
    const semanticIndicators = [
      'size.*scale', 'life.*status', 'gender', 'geography.*location',
      'leadership.*roles', 'time.*era', 'color.*appearance'
    ]

    const identifiedCategories = semanticIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prevention)
    ).length

    return Math.min(1, identifiedCategories / 3) // Expect at least 3 categories for good coverage
  }

  private evaluatePreventionInstructions(prevention: string): number {
    const preventionInstructions = [
      'do not repeat',
      'completely different',
      'new question',
      'avoid.*variations',
      'not.*same.*topic'
    ]

    const presentInstructions = preventionInstructions.filter(instruction => 
      new RegExp(instruction, 'i').test(prevention)
    )

    return presentInstructions.length / preventionInstructions.length
  }

  private evaluateAnalysisDepth(analysis: string): number {
    const depthIndicators = [
      'domain.*space.*remains',
      'sub-domain',
      'established.*domain',
      'narrowing.*analysis',
      'possibilities.*analysis'
    ]

    const presentIndicators = depthIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(analysis)
    )

    return presentIndicators.length / depthIndicators.length
  }

  private evaluatePracticalGuidance(analysis: string): number {
    const guidanceElements = [
      'examples.*proper',
      'next.*question.*must',
      'further.*narrow',
      'specific.*sub-domain'
    ]

    const presentElements = guidanceElements.filter(element => 
      new RegExp(element, 'i').test(analysis)
    )

    return presentElements.length / guidanceElements.length
  }

  private evaluateDomainViolationPrevention(analysis: string): number {
    const violationElements = [
      'domain violation.*examples',
      'do not do this',
      'completely wrong domain',
      'already established'
    ]

    const presentElements = violationElements.filter(element => 
      new RegExp(element, 'i').test(analysis)
    )

    return presentElements.length / violationElements.length
  }

  private evaluateConstraintCompleteness(constraints: string, category: string): number {
    const requiredElements = ['FORBIDDEN', 'APPROPRIATE', 'CRITICAL', category.toUpperCase()]
    
    const presentElements = requiredElements.filter(element => 
      constraints.toUpperCase().includes(element)
    )

    return presentElements.length / requiredElements.length
  }

  private evaluateForbiddenQuestionCoverage(constraints: string, category: string): number {
    // Category-specific forbidden patterns that should be mentioned
    const forbiddenPatterns: Record<string, string[]> = {
      'world leaders': ['color', 'plastic', 'hold it', 'electronic', 'smaller than'],
      'animals': ['president', 'serve', 'electronic', 'furniture'],
      'objects': ['male', 'alive', 'president', 'eat'],
      'cricket players': ['color', 'plastic', 'smaller than', 'hold it'],
      'football players': ['color', 'electronic', 'smaller than', 'plastic'],
      'nba players': ['color', 'plastic', 'hold it', 'electronic']
    }

    const patterns = forbiddenPatterns[category.toLowerCase()] || []
    if (patterns.length === 0) return 1

    const mentionedPatterns = patterns.filter(pattern => 
      constraints.toLowerCase().includes(pattern)
    )

    return mentionedPatterns.length / patterns.length
  }

  private evaluateAppropriateQuestionPromotion(constraints: string, category: string): number {
    // Check for positive examples of good questions
    const appropriatePatterns: Record<string, string[]> = {
      'world leaders': ['are they male', 'are they alive', 'are they from', 'were they a'],
      'animals': ['is it a mammal', 'is it wild', 'is it larger', 'does it live'],
      'objects': ['is it electronic', 'can you hold', 'is it made of', 'is it found'],
      'cricket players': ['are they active', 'are they from', 'are they a batsman'],
      'football players': ['are they active', 'are they a quarterback', 'have they won'],
      'nba players': ['are they active', 'are they a guard', 'have they won']
    }

    const patterns = appropriatePatterns[category.toLowerCase()] || []
    if (patterns.length === 0) return 1

    const mentionedPatterns = patterns.filter(pattern => 
      constraints.toLowerCase().includes(pattern)
    )

    return mentionedPatterns.length / patterns.length
  }

  private evaluateSectionIntegration(prompt: string): number {
    // Check for smooth transitions between sections
    const transitionIndicators = [
      'based on.*above',
      'given.*facts',
      'following.*guidance',
      'considering.*information'
    ]

    const presentTransitions = transitionIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    )

    // Check for logical flow
    const logicalFlow = this.measureSemanticCoherence(prompt)

    return (presentTransitions.length / transitionIndicators.length) * 0.5 + logicalFlow * 0.5
  }

  private evaluateActionability(prompt: string): number {
    const actionableElements = [
      'ask.*question',
      'output.*only',
      'respond.*with',
      'work.*through.*steps',
      'must.*complete'
    ]

    const presentElements = actionableElements.filter(element => 
      new RegExp(element, 'i').test(prompt)
    )

    return presentElements.length / actionableElements.length
  }

  private checkFactCondition(facts: FactsByAnswer, condition: string): boolean {
    const allFacts = [
      ...facts.yesFacts.map(f => f.q),
      ...facts.noFacts.map(f => f.q),
      ...facts.maybeFacts.map(f => f.q)
    ]

    return allFacts.some(fact => new RegExp(condition, 'i').test(fact))
  }

  // Answer type detection helpers
  private isYesAnswer(answer: string): boolean {
    return answer.startsWith('y') || answer === 'yes' || answer.includes('yeah') || answer.includes('yep')
  }

  private isNoAnswer(answer: string): boolean {
    return answer.startsWith('n') || answer === 'no' || answer.includes('nope')
  }

  private isMaybeAnswer(answer: string): boolean {
    return answer.includes('maybe') || answer.includes('sometimes') || answer.includes('it depends')
  }

  private isDontKnowAnswer(answer: string): boolean {
    return answer.includes("don't know") || answer.includes('dont know') || answer.includes('unknown')
  }
}