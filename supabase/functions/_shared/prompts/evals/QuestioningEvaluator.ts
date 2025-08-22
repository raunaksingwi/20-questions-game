/**
 * Comprehensive evaluator for AI Questioning Templates across all game categories.
 * Measures question quality, strategic progression, and category adherence.
 */

import { BaseEvaluator, EvaluationMetric, TestScenario } from './BaseEvaluator.ts'
import { MetricsCollector, PerformanceBenchmarks } from './MetricsCollector.ts'
import { 
  AIQuestioningTemplateFactory,
  AnimalsAIQuestioningTemplate,
  ObjectsAIQuestioningTemplate,
  WorldLeadersAIQuestioningTemplate,
  CricketPlayersAIQuestioningTemplate,
  FootballPlayersAIQuestioningTemplate,
  NBAPlayersAIQuestioningTemplate
} from '../AIQuestioningTemplate.ts'

export interface QuestioningTestScenario extends TestScenario {
  category: string
  questionsAsked: number
  conversationHistory: string
  alreadyAskedQuestions: string[]
  expectedQuestionType?: string
  shouldAvoidRepetition?: boolean
}

export class QuestioningEvaluator extends BaseEvaluator {
  constructor() {
    super('QuestioningEvaluator', 'ai_questioning_templates')
  }

  /**
   * Collects comprehensive metrics for AI questioning template evaluation
   */
  protected async collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]> {
    const testScenario = scenario as QuestioningTestScenario
    const metrics: EvaluationMetric[] = []

    // Generate question using the template
    const template = AIQuestioningTemplateFactory.createTemplate(testScenario.category)
    const generatedPrompt = template.generate(
      testScenario.questionsAsked,
      testScenario.conversationHistory,
      testScenario.alreadyAskedQuestions
    )

    // Core Template Quality Metrics
    metrics.push(...this.evaluateTemplateStructure(generatedPrompt, testScenario.category))
    
    // Question Generation Quality
    metrics.push(...this.evaluateQuestionGeneration(generatedPrompt, testScenario))
    
    // Strategic Progression Analysis
    metrics.push(...this.evaluateStrategicProgression(generatedPrompt, testScenario))
    
    // Category Adherence
    metrics.push(...this.evaluateCategoryAdherence(generatedPrompt, testScenario.category))
    
    // Repetition Prevention
    if (testScenario.alreadyAskedQuestions.length > 0) {
      metrics.push(...this.evaluateRepetitionPrevention(generatedPrompt, testScenario))
    }
    
    // Logical Consistency
    metrics.push(...this.evaluateLogicalConsistency(generatedPrompt, testScenario))

    return metrics
  }

  /**
   * Evaluates the overall structure and completeness of generated template
   */
  private evaluateTemplateStructure(prompt: string, category: string): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Check for required sections
    const requiredSections = [
      'CORE RULES',
      'STRATEGIC QUESTION TYPES',
      'QUESTIONING ORDER',
      'LOGICAL DEDUCTIONS',
      'OUTPUT FORMAT'
    ]

    const sectionsPresent = requiredSections.filter(section => 
      prompt.toUpperCase().includes(section)
    ).length

    metrics.push(this.createMetric(
      'template_completeness',
      sectionsPresent / requiredSections.length,
      'Percentage of required template sections present',
      0.8
    ))

    // Template length appropriateness
    const lengthScore = this.normalizeScore(prompt.length, 500, 3000)
    metrics.push(this.createMetric(
      'template_length_appropriateness',
      lengthScore,
      'Whether template length is appropriate for complexity',
      0.5
    ))

    // Category-specific content presence
    const categoryScore = this.evaluateCategorySpecificContent(prompt, category)
    metrics.push(this.createMetric(
      'category_specific_content',
      categoryScore,
      'Presence of category-specific guidance and examples',
      0.7
    ))

    return metrics
  }

  /**
   * Evaluates quality of question generation guidance
   */
  private evaluateQuestionGeneration(prompt: string, scenario: QuestioningTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Binary question guidance
    const binaryGuidanceScore = this.evaluateBinaryQuestionGuidance(prompt)
    metrics.push(this.createMetric(
      'binary_question_guidance',
      binaryGuidanceScore,
      'Quality of yes/no question generation guidance',
      0.8
    ))

    // Concrete vs vague question prevention
    const concreteGuidanceScore = this.evaluateConcreteQuestionGuidance(prompt)
    metrics.push(this.createMetric(
      'concrete_question_guidance',
      concreteGuidanceScore,
      'Effectiveness of vague question prevention',
      0.9
    ))

    // Strategic question examples quality
    const exampleQuality = this.evaluateStrategicExamples(prompt, scenario.category)
    metrics.push(this.createMetric(
      'strategic_examples_quality',
      exampleQuality,
      'Quality and relevance of strategic question examples',
      0.7
    ))

    return metrics
  }

  /**
   * Evaluates strategic progression logic and effectiveness
   */
  private evaluateStrategicProgression(prompt: string, scenario: QuestioningTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Progression clarity
    const progressionClarityScore = this.evaluateProgressionClarity(prompt)
    metrics.push(this.createMetric(
      'progression_clarity',
      progressionClarityScore,
      'Clarity of strategic questioning progression',
      0.8
    ))

    // Game stage adaptation
    const stageAdaptationScore = this.evaluateGameStageAdaptation(prompt, scenario.questionsAsked)
    metrics.push(this.createMetric(
      'stage_adaptation',
      stageAdaptationScore,
      'How well template adapts to different game stages',
      0.7
    ))

    // Information gain optimization
    const infoGainScore = this.evaluateInformationGainGuidance(prompt)
    metrics.push(this.createMetric(
      'information_gain_guidance',
      infoGainScore,
      'Quality of information gain optimization guidance',
      0.6
    ))

    return metrics
  }

  /**
   * Evaluates adherence to category constraints and appropriateness
   */
  private evaluateCategoryAdherence(prompt: string, category: string): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Category constraint enforcement
    const constraintScore = this.evaluateCategoryConstraints(prompt, category)
    metrics.push(this.createMetric(
      'category_constraint_enforcement',
      constraintScore,
      'Effectiveness of category constraint enforcement',
      0.9
    ))

    // Category isolation (no cross-category content)
    const categoryIsolationScore = this.evaluateForbiddenQuestionPrevention(prompt, category)
    metrics.push(this.createMetric(
      'category_isolation',
      categoryIsolationScore,
      'How well template maintains category isolation (no cross-category content)',
      0.95
    ))

    // Appropriate question encouragement
    const appropriateEncouragementScore = this.evaluateAppropriateQuestionEncouragement(prompt, category)
    metrics.push(this.createMetric(
      'appropriate_question_encouragement',
      appropriateEncouragementScore,
      'Quality of category-appropriate question suggestions',
      0.8
    ))

    return metrics
  }

  /**
   * Evaluates repetition and redundancy prevention mechanisms
   */
  private evaluateRepetitionPrevention(prompt: string, scenario: QuestioningTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Explicit repetition prevention
    const explicitPreventionScore = this.evaluateExplicitRepetitionPrevention(prompt, scenario.alreadyAskedQuestions)
    metrics.push(this.createMetric(
      'explicit_repetition_prevention',
      explicitPreventionScore,
      'How well template lists and prevents exact question repetition',
      0.9
    ))

    // Semantic similarity prevention
    const semanticPreventionScore = this.evaluateSemanticSimilarityPrevention(prompt)
    metrics.push(this.createMetric(
      'semantic_similarity_prevention',
      semanticPreventionScore,
      'Effectiveness of semantic similarity detection and prevention',
      0.8
    ))

    // Redundancy avoidance guidance
    const redundancyGuidanceScore = this.evaluateRedundancyGuidance(prompt)
    metrics.push(this.createMetric(
      'redundancy_avoidance_guidance',
      redundancyGuidanceScore,
      'Quality of logical redundancy avoidance guidance',
      0.8
    ))

    return metrics
  }

  /**
   * Evaluates logical consistency and deduction quality
   */
  private evaluateLogicalConsistency(prompt: string, scenario: QuestioningTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Logical deduction accuracy
    const deductionAccuracy = this.evaluateLogicalDeductions(prompt, scenario.category)
    metrics.push(this.createMetric(
      'logical_deduction_accuracy',
      deductionAccuracy,
      'Accuracy of logical deductions provided in template',
      0.9
    ))

    // Contradiction prevention
    const contradictionPrevention = this.evaluateContradictionPrevention(prompt)
    metrics.push(this.createMetric(
      'contradiction_prevention',
      contradictionPrevention,
      'How well template prevents logical contradictions',
      0.95
    ))

    // Domain coherence
    const domainCoherence = this.evaluateDomainCoherence(prompt, scenario.category)
    metrics.push(this.createMetric(
      'domain_coherence',
      domainCoherence,
      'Coherence within the specific domain/category',
      0.8
    ))

    return metrics
  }

  // ========== EVALUATION HELPER METHODS ==========

  private evaluateCategorySpecificContent(prompt: string, category: string): number {
    const categoryKeywords: Record<string, string[]> = {
      'animals': ['mammal', 'wild', 'domestic', 'carnivore', 'herbivore', 'habitat'],
      'objects': ['electronic', 'material', 'portable', 'handheld', 'tool', 'furniture'],
      'world leaders': ['political', 'president', 'minister', 'country', 'government', 'democracy'],
      'cricket players': ['cricket', 'batsman', 'bowler', 'captain', 'team', 'championship'],
      'football players': ['football', 'quarterback', 'offense', 'defense', 'super bowl'],
      'nba players': ['basketball', 'nba', 'guard', 'center', 'forward', 'mvp']
    }

    const keywords = categoryKeywords[category.toLowerCase()] || []
    if (keywords.length === 0) return 1

    const matchedKeywords = keywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword)
    )

    return matchedKeywords.length / keywords.length
  }

  private evaluateBinaryQuestionGuidance(prompt: string): number {
    const binaryIndicators = [
      'yes/no question',
      'binary question',
      'ask one clear yes/no',
      'specific yes/no',
      'concrete yes/no'
    ]

    const multipleChoiceWarnings = [
      'avoid.*or',
      'not.*multiple choice',
      'don\'t.*compound',
      'no.*alternatives'
    ]

    let score = 0
    score += binaryIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    ).length * 0.3

    score += multipleChoiceWarnings.filter(warning => 
      new RegExp(warning, 'i').test(prompt)
    ).length * 0.2

    return Math.min(1, score)
  }

  private evaluateConcreteQuestionGuidance(prompt: string): number {
    // Check for vague question examples and warnings
    const vagueWarnings = [
      'unique characteristics',
      'special characteristics',
      'vague questions',
      'avoid.*vague',
      'concrete.*specific',
      'not.*subjective'
    ]

    const concreteExamples = [
      'are they from',
      'is it made of',
      'does it have',
      'are they male',
      'is it larger than'
    ]

    let score = 0
    score += vagueWarnings.filter(warning => 
      new RegExp(warning, 'i').test(prompt)
    ).length * 0.4

    score += concreteExamples.filter(example => 
      new RegExp(example, 'i').test(prompt)
    ).length * 0.2

    return Math.min(1, score)
  }

  private evaluateStrategicExamples(prompt: string, category: string): number {
    // Category-specific strategic examples
    const strategicPatterns: Record<string, string[]> = {
      'animals': ['mammal.*bird', 'wild.*domestic', 'carnivore.*herbivore'],
      'objects': ['electronic.*manual', 'portable.*stationary', 'kitchen.*bedroom'],
      'world leaders': ['alive.*dead', 'europe.*asia', 'president.*minister'],
      'cricket players': ['active.*retired', 'batsman.*bowler', 'india.*australia'],
      'football players': ['active.*retired', 'quarterback.*defense', 'afc.*nfc'],
      'nba players': ['active.*retired', 'guard.*center', 'western.*eastern']
    }

    const patterns = strategicPatterns[category.toLowerCase()] || []
    if (patterns.length === 0) return 0.5

    const matchedPatterns = patterns.filter(pattern => 
      new RegExp(pattern, 'i').test(prompt)
    )

    return matchedPatterns.length / patterns.length
  }

  private evaluateProgressionClarity(prompt: string): number {
    const progressionIndicators = [
      'start broad.*narrow',
      'progression',
      'order.*questioning',
      'step.*step',
      'first.*then.*finally'
    ]

    let score = 0
    score += progressionIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    ).length * 0.25

    // Check for numbered progression
    if (/\d+\.\s/.test(prompt)) score += 0.3

    return Math.min(1, score)
  }

  private evaluateGameStageAdaptation(prompt: string, questionsAsked: number): number {
    // Early game (0-5 questions)
    if (questionsAsked <= 5) {
      const earlyGameIndicators = ['broad', 'general', 'category', 'classification']
      const score = earlyGameIndicators.filter(indicator => 
        prompt.toLowerCase().includes(indicator)
      ).length / earlyGameIndicators.length
      return score
    }

    // Mid game (6-12 questions)
    if (questionsAsked <= 12) {
      const midGameIndicators = ['narrow', 'specific', 'characteristics', 'properties']
      const score = midGameIndicators.filter(indicator => 
        prompt.toLowerCase().includes(indicator)
      ).length / midGameIndicators.length
      return score
    }

    // Late game (13+ questions)
    const lateGameIndicators = ['guess', 'specific.*item', 'confident', 'identify']
    const score = lateGameIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    ).length / lateGameIndicators.length
    return score
  }

  private evaluateInformationGainGuidance(prompt: string): number {
    const infoGainIndicators = [
      'eliminate.*half',
      'information.*gain',
      'narrow.*possibilities',
      'split.*remaining',
      'optimal.*elimination'
    ]

    const matchedIndicators = infoGainIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    )

    return matchedIndicators.length / infoGainIndicators.length
  }

  private evaluateCategoryConstraints(prompt: string, category: string): number {
    // Check for forbidden question lists specific to category
    const hasForbiddenSection = /❌.*FORBIDDEN|FORBIDDEN.*QUESTIONS/i.test(prompt)
    const hasAppropriateSections = /✅.*APPROPRIATE|APPROPRIATE.*QUESTIONS/i.test(prompt)
    const hasCriticalInstruction = /CRITICAL.*ONLY.*ask/i.test(prompt)

    let score = 0
    if (hasForbiddenSection) score += 0.4
    if (hasAppropriateSections) score += 0.4
    if (hasCriticalInstruction) score += 0.2

    return score
  }

  private evaluateForbiddenQuestionPrevention(prompt: string, category: string): number {
    // New approach: Check for category isolation by ensuring NO cross-category content appears
    // This is better than checking for forbidden examples since we achieved clean isolation
    
    const crossCategoryContent: Record<string, string[]> = {
      'world leaders': ['electronic', 'plastic', 'mammal', 'wild', 'carnivore', 'furniture'],
      'animals': ['president', 'minister', 'serve', 'electronic', 'plastic', 'furniture'], 
      'objects': ['president', 'minister', 'male', 'female', 'alive', 'mammal', 'wild'],
      'cricket players': ['electronic', 'plastic', 'mammal', 'wild', 'furniture'],
      'football players': ['electronic', 'plastic', 'mammal', 'wild', 'furniture'],
      'nba players': ['electronic', 'plastic', 'mammal', 'wild', 'furniture']
    }

    const prohibitedContent = crossCategoryContent[category.toLowerCase()] || []
    if (prohibitedContent.length === 0) return 1

    // Count how many prohibited terms DON'T appear (higher is better for isolation)
    const absentProhibited = prohibitedContent.filter(content => 
      !prompt.toLowerCase().includes(content.toLowerCase())
    )

    return absentProhibited.length / prohibitedContent.length
  }

  private evaluateAppropriateQuestionEncouragement(prompt: string, category: string): number {
    // Category-specific appropriate question patterns
    const appropriatePatterns: Record<string, string[]> = {
      'world leaders': ['are they male', 'are they alive', 'are they from', 'were they a'],
      'animals': ['is it a mammal', 'is it wild', 'is it larger than', 'does it live'],
      'objects': ['is it electronic', 'can you hold it', 'is it made of', 'is it found in'],
      'cricket players': ['are they active', 'are they from', 'are they a batsman', 'have they won'],
      'football players': ['are they active', 'are they a quarterback', 'have they won', 'are they afc'],
      'nba players': ['are they active', 'are they a guard', 'have they won', 'are they western']
    }

    const patterns = appropriatePatterns[category.toLowerCase()] || []
    if (patterns.length === 0) return 1

    const mentionedAppropriate = patterns.filter(pattern => 
      prompt.toLowerCase().includes(pattern)
    )

    return mentionedAppropriate.length / patterns.length
  }

  private evaluateExplicitRepetitionPrevention(prompt: string, alreadyAsked: string[]): number {
    if (alreadyAsked.length === 0) return 1

    // Check if already asked questions are listed in prompt
    const listedQuestions = alreadyAsked.filter(question => 
      prompt.includes(question)
    )

    const listingScore = listedQuestions.length / alreadyAsked.length

    // Check for repetition warnings
    const hasRepetitionWarning = /DO NOT REPEAT|ALREADY ASKED|NEW QUESTION/i.test(prompt)
    const warningScore = hasRepetitionWarning ? 0.3 : 0

    return Math.min(1, listingScore * 0.7 + warningScore)
  }

  private evaluateSemanticSimilarityPrevention(prompt: string): number {
    const semanticIndicators = [
      'semantic.*similar',
      'variations.*same',
      'different.*words.*same.*topic',
      'semantically.*similar',
      'category.*explored',
      'different.*grammar',
      'paraphras',
      'synonym',
      'same.*concept',
      'rephrasing'
    ]

    // Enhanced checking for concrete examples of semantic variations
    const hasConcreteExamples = /(".*"\s*=\s*".*"|same as|similar to|equivalent to)/i.test(prompt)
    const hasGrammarVariationWarning = /(active.*passive|passive.*active|different.*tense|grammatical.*variation)/i.test(prompt)
    const hasSynonymWarning = /(synonym|same.*meaning|identical.*concept)/i.test(prompt)
    
    const matchedIndicators = semanticIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    )
    
    let score = matchedIndicators.length / semanticIndicators.length
    
    // Bonus points for concrete examples and specific warnings
    if (hasConcreteExamples) score += 0.2
    if (hasGrammarVariationWarning) score += 0.1
    if (hasSynonymWarning) score += 0.1

    return Math.min(1, score)
  }

  private evaluateRedundancyGuidance(prompt: string): number {
    const redundancyIndicators = [
      'logical.*redundancy',
      'avoid.*redundancy',
      'already.*know',
      'logical.*consequence',
      'deduction.*guidance'
    ]

    const matchedIndicators = redundancyIndicators.filter(indicator => 
      new RegExp(indicator, 'i').test(prompt)
    )

    return matchedIndicators.length / redundancyIndicators.length
  }

  private evaluateLogicalDeductions(prompt: string, category: string): number {
    // Check for logical deduction examples
    const deductionPatterns = [
      'if.*yes.*then',
      'if.*no.*then',
      'logical.*deduction',
      '→.*not',
      'eliminates'
    ]

    const deductionScore = deductionPatterns.filter(pattern => 
      new RegExp(pattern, 'i').test(prompt)
    ).length / deductionPatterns.length

    // Category-specific deduction accuracy
    const categoryDeductionScore = this.evaluateCategorySpecificDeductions(prompt, category)

    return (deductionScore * 0.6) + (categoryDeductionScore * 0.4)
  }

  private evaluateCategorySpecificDeductions(prompt: string, category: string): number {
    // Validate category-specific logical rules
    const categoryRules: Record<string, Array<{ if: string, then: string }>> = {
      'animals': [
        { if: 'mammal.*yes', then: 'not.*bird.*reptile' },
        { if: 'wild.*yes', then: 'not.*domestic.*pet' }
      ],
      'world leaders': [
        { if: 'alive.*yes', then: 'not.*historical' },
        { if: 'male.*yes', then: 'not.*female' }
      ],
      'objects': [
        { if: 'electronic.*yes', then: 'not.*living.*organic' },
        { if: 'handheld.*yes', then: 'not.*furniture' }
      ]
    }

    const rules = categoryRules[category.toLowerCase()] || []
    if (rules.length === 0) return 1

    const validRules = rules.filter(rule => {
      const hasCondition = new RegExp(rule.if, 'i').test(prompt)
      const hasConclusion = new RegExp(rule.then, 'i').test(prompt)
      return hasCondition && hasConclusion
    })

    return validRules.length / rules.length
  }

  private evaluateContradictionPrevention(prompt: string): number {
    const contradictionWarnings = [
      'avoid.*contradiction',
      'logical.*consistency',
      'don\'t.*ask.*if.*already',
      'redundant.*with.*confirmed'
    ]

    const matchedWarnings = contradictionWarnings.filter(warning => 
      new RegExp(warning, 'i').test(prompt)
    )

    return matchedWarnings.length / contradictionWarnings.length
  }

  private evaluateDomainCoherence(prompt: string, category: string): number {
    // Check for domain narrowing guidance
    const domainGuidance = [
      'domain.*narrowing',
      'sub-domain',
      'within.*established.*domain',
      'domain.*space.*remains'
    ]

    const matchedGuidance = domainGuidance.filter(guidance => 
      new RegExp(guidance, 'i').test(prompt)
    )

    const guidanceScore = matchedGuidance.length / domainGuidance.length

    // Check for domain violation examples
    const hasDomainViolationExamples = /DOMAIN VIOLATION.*EXAMPLES/i.test(prompt)
    const violationScore = hasDomainViolationExamples ? 0.3 : 0

    return Math.min(1, guidanceScore * 0.7 + violationScore)
  }
}

/**
 * Enhanced semantic similarity detection for testing
 */
export class SemanticSimilarityDetector {
  /**
   * Checks if two questions are semantically similar
   */
  static areQuestionsSimilar(q1: string, q2: string): boolean {
    const normalize = (s: string) => 
      s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(is|it|a|an|the|does|do|can|will|would|they|he|she|are|were|was|did|have|has|had)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    
    const n1 = normalize(q1)
    const n2 = normalize(q2)
    
    // Exact match after normalization
    if (n1 === n2) return true
    
    // Substring match
    if (n1.includes(n2) || n2.includes(n1)) return true
    
    // Enhanced concept mapping - check for conceptual equivalence
    if (this.areConceptuallyEquivalent(q1, q2)) return true
    
    // Check for synonym patterns (enhanced)
    const synonymGroups = [
      ['big', 'large', 'huge', 'massive', 'enormous', 'giant'],
      ['small', 'tiny', 'little', 'mini', 'compact', 'miniature'],
      ['electronic', 'digital', 'computerized', 'electrical', 'tech', 'technological'],
      ['hold', 'carry', 'portable', 'handheld', 'grip'],
      ['expensive', 'costly', 'pricey', 'dear', 'valuable'],
      ['useful', 'helpful', 'beneficial', 'handy'],
      ['active', 'playing', 'current', 'ongoing', 'still', 'now', 'currently'],
      ['retired', 'former', 'ex', 'past', 'previously'],
      ['alive', 'living', 'life', 'live'],
      ['dead', 'deceased', 'passed', 'died'],
      ['male', 'man', 'masculine', 'boy', 'gentleman'],
      ['female', 'woman', 'feminine', 'girl', 'lady'],
      ['from', 'originate', 'born', 'native', 'come'],
      ['europe', 'european'],
      ['india', 'indian'],
      ['america', 'american'],
      ['president', 'presidency', 'presidential'],
      ['captain', 'captaincy', 'captained', 'lead', 'led'],
      ['wild', 'untamed', 'feral'],
      ['domestic', 'pet', 'tame', 'domesticated'],
      ['batsman', 'batter', 'bat'],
      ['carnivore', 'carnivorous', 'predator', 'meat', 'hunt'],
      ['electricity', 'power', 'energy', 'battery', 'electric'],
      ['serve', 'served', 'serving', 'service'],
      ['wartime', 'war.*time', 'during.*war'],
      ['democratic', 'democracy', 'elected', 'election'],
      ['popular', 'popularity', 'liked', 'well.*liked'],
      ['controversial', 'controversy', 'disputed', 'debated'],
      ['daily', 'everyday', 'day', 'regularly']
    ]
    
    for (const group of synonymGroups) {
      const hasQ1Match = group.some(word => n1.includes(word))
      const hasQ2Match = group.some(word => n2.includes(word))
      if (hasQ1Match && hasQ2Match) return true
    }
    
    // Grammar variation detection
    if (this.areGrammaticalVariations(n1, n2)) return true
    
    // Word overlap check (improved)
    const words1 = n1.split(' ').filter(w => w.length > 2)
    const words2 = n2.split(' ').filter(w => w.length > 2)
    
    if (words1.length > 0 && words2.length > 0) {
      const overlap = words1.filter(w => words2.includes(w))
      const overlapRatio = overlap.length / Math.min(words1.length, words2.length)
      // More strict threshold - need significant overlap for word-based matching
      if (overlapRatio > 0.7 && overlap.length >= 2) return true
    }
    
    return false
  }
  
  /**
   * Checks for conceptual equivalence between questions
   */
  private static areConceptuallyEquivalent(q1: string, q2: string): boolean {
    // First check for concepts that should NOT be considered equivalent
    const distinctConcepts = [
      {
        concept1: /start.*war|initiate.*war|begin.*war/,
        concept2: /serve.*war|during.*war|wartime/,
        reason: 'Starting wars vs serving during wars are different actions'
      },
      {
        concept1: /popular.*voter|liked.*voter|voter.*like/,
        concept2: /elected|election|democratic/,
        reason: 'Being popular vs being elected are different concepts'
      }
    ]

    for (const distinction of distinctConcepts) {
      const q1HasConcept1 = distinction.concept1.test(q1.toLowerCase())
      const q1HasConcept2 = distinction.concept2.test(q1.toLowerCase())
      const q2HasConcept1 = distinction.concept1.test(q2.toLowerCase())
      const q2HasConcept2 = distinction.concept2.test(q2.toLowerCase())
      
      if ((q1HasConcept1 && q2HasConcept2) || (q1HasConcept2 && q2HasConcept1)) {
        return false // These are explicitly different concepts
      }
    }

    const conceptMappings = [
      // Electronic/Electricity concepts
      {
        patterns: [/electronic/, /digital/, /computerized/],
        related: [/electricity/, /power/, /energy/, /battery/]
      },
      // Meat eating concepts  
      {
        patterns: [/carnivore/, /carnivorous/, /predator/],
        related: [/meat/, /hunt/, /prey/, /kill/]
      },
      // Geographic origin concepts
      {
        patterns: [/from\s+(\w+)/, /(\w+)$/],
        related: [/born.*(\w+)/, /originate.*(\w+)/, /native.*(\w+)/, /represent.*(\w+)/]
      },
      // Presidential/Leadership concepts (refined)
      {
        patterns: [/president/, /presidency/],
        related: [/serve.*president/, /hold.*presidency/, /office.*president/]
      },
      // Activity/Playing concepts
      {
        patterns: [/active/, /currently/, /still/],
        related: [/play/, /playing/, /now/, /today/]
      },
      // Daily usage concepts
      {
        patterns: [/daily/, /every.*day/, /everyday/],
        related: [/people.*use/, /use.*regularly/, /regular.*use/]
      },
      // Democratic election concepts
      {
        patterns: [/democratic/, /democracy/, /democratically.*elected/],
        related: [/elected.*people/, /people.*elect/, /elected.*by.*people/]
      },
      // War/Conflict concepts
      {
        patterns: [/wartime/, /during.*war/, /serve.*war/],
        related: [/presidency.*war/, /office.*war/, /wartime.*president/]
      },
      // Size concepts
      {
        patterns: [/big/, /large/, /huge/],
        related: [/massive/, /enormous/, /giant/, /size/]
      }
    ]
    
    const q1Lower = q1.toLowerCase()
    const q2Lower = q2.toLowerCase()
    
    // Check for exclusions first - concepts that shouldn't be considered similar
    const exclusions = [
      { pattern: /start.*war|begin.*war/, excludes: [/serve.*war/, /during.*war/, /wartime/] },
      { pattern: /popular.*voter|popularity.*voter/, excludes: [/democratic/, /elected/] },
      { pattern: /win.*war|victory.*war/, excludes: [/serve.*war/, /during.*war/] }
    ]
    
    for (const exclusion of exclusions) {
      if (exclusion.pattern.test(q1Lower) || exclusion.pattern.test(q2Lower)) {
        const hasExcludedConcept = exclusion.excludes.some(exc => 
          exc.test(q1Lower) || exc.test(q2Lower)
        )
        if (hasExcludedConcept) {
          return false // Explicitly different concepts
        }
      }
    }
    
    for (const mapping of conceptMappings) {
      const q1HasPattern = mapping.patterns.some(p => p.test(q1Lower))
      const q2HasRelated = mapping.related.some(p => p.test(q2Lower))
      const q2HasPattern = mapping.patterns.some(p => p.test(q2Lower))
      const q1HasRelated = mapping.related.some(p => p.test(q1Lower))
      
      if ((q1HasPattern && q2HasRelated) || (q2HasPattern && q1HasRelated)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Detects grammatical variations of the same question
   */
  private static areGrammaticalVariations(n1: string, n2: string): boolean {
    // Remove tense markers and reorder words to detect grammatical variations
    const simplify = (s: string) => {
      return s
        .replace(/\b(do|does|did|will|would|have|has|had|been|being)\b/g, '')
        .replace(/\b(currently|now|still|today|every|most|all)\b/g, '')
        .split(' ')
        .filter(w => w.length > 2)
        .sort()
        .join(' ')
        .trim()
    }
    
    const s1 = simplify(n1)
    const s2 = simplify(n2)
    
    // If simplified versions are very similar, likely grammatical variations
    if (s1 && s2) {
      const similarity = this.calculateWordSimilarity(s1, s2)
      if (similarity > 0.7) return true
    }
    
    // Check for specific grammatical patterns
    const grammarPatterns = [
      // Active vs passive voice
      { active: /(\w+)\s+(serve|play|use|hold)/, passive: /(serve|play|use|hold).*by.*(\w+)/ },
      // Present vs past tense
      { present: /currently/, past: /previously|former|used/ },
      // Different question structures for same concept
      { pattern1: /from\s+(\w+)/, pattern2: /(\w+)$/ } // "from Europe" vs "European"
    ]
    
    for (const pattern of grammarPatterns) {
      if ('active' in pattern && 'passive' in pattern && pattern.active && pattern.passive) {
        if ((pattern.active.test(n1) && pattern.passive.test(n2)) ||
            (pattern.passive.test(n1) && pattern.active.test(n2))) {
          return true
        }
      }
    }
    
    return false
  }
  
  /**
   * Calculates word-level similarity between two strings
   */
  private static calculateWordSimilarity(s1: string, s2: string): number {
    const words1 = s1.split(' ').filter(w => w.length > 0)
    const words2 = s2.split(' ').filter(w => w.length > 0)
    
    if (words1.length === 0 || words2.length === 0) return 0
    
    const intersection = words1.filter(w => words2.includes(w))
    const union = [...new Set([...words1, ...words2])]
    
    return intersection.length / union.length
  }
  
  /**
   * Evaluates how well a prompt prevents semantic duplicates
   */
  static evaluateSemanticDuplicationPrevention(
    prompt: string, 
    alreadyAskedQuestions: string[],
    generatedQuestion?: string
  ): number {
    if (!generatedQuestion || alreadyAskedQuestions.length === 0) {
      return 1 // No duplicates possible if no questions
    }
    
    // Check if the generated question is semantically similar to any previous question
    const isDuplicate = alreadyAskedQuestions.some(prevQ => 
      this.areQuestionsSimilar(generatedQuestion, prevQ)
    )
    
    if (isDuplicate) {
      // Found a semantic duplicate - major failure
      return 0
    }
    
    // Check prompt quality for preventing duplicates
    let score = 0.5 // Base score for not generating duplicate
    
    // Check if prompt explicitly lists the questions to avoid
    const listedCount = alreadyAskedQuestions.filter(q => prompt.includes(q)).length
    score += (listedCount / alreadyAskedQuestions.length) * 0.2
    
    // Check for semantic similarity warnings
    if (/semantic.*similar|different.*grammar|paraphras|synonym/i.test(prompt)) {
      score += 0.15
    }
    
    // Check for concrete examples of what to avoid
    if (/same as|similar to|equivalent to|".*"\s*=\s*".*"/i.test(prompt)) {
      score += 0.15
    }
    
    return Math.min(1, score)
  }
}

/**
 * Specialized evaluator for category-specific questioning templates
 */
export class CategoryQuestioningEvaluator extends QuestioningEvaluator {
  private category: string

  constructor(category: string) {
    super()
    this.category = category
    this.evaluatorName = `${category}QuestioningEvaluator`
  }

  /**
   * Creates category-specific test scenarios
   */
  createCategoryTestScenarios(): QuestioningTestScenario[] {
    return [
      // Early game scenarios
      {
        name: `${this.category}_early_game`,
        description: `Early game questioning for ${this.category}`,
        category: this.category,
        questionsAsked: 2,
        conversationHistory: 'Starting new game',
        alreadyAskedQuestions: ['Is it large?'],
        input: {}
      },
      
      // Mid game scenarios
      {
        name: `${this.category}_mid_game`,
        description: `Mid game strategic questioning for ${this.category}`,
        category: this.category,
        questionsAsked: 8,
        conversationHistory: this.getMidGameHistory(this.category),
        alreadyAskedQuestions: this.getMidGameQuestions(this.category),
        input: {}
      },
      
      // Late game scenarios
      {
        name: `${this.category}_late_game`,
        description: `Late game specific guessing for ${this.category}`,
        category: this.category,
        questionsAsked: 15,
        conversationHistory: this.getLateGameHistory(this.category),
        alreadyAskedQuestions: this.getLateGameQuestions(this.category),
        input: {}
      },
      
      // Edge case: many don't know answers
      {
        name: `${this.category}_uncertain_answers`,
        description: `Handling uncertain/don't know answers for ${this.category}`,
        category: this.category,
        questionsAsked: 6,
        conversationHistory: this.getUncertainHistory(this.category),
        alreadyAskedQuestions: ['Are they alive?', 'Are they from Europe?'],
        input: {}
      }
    ]
  }

  private getMidGameHistory(category: string): string {
    const histories: Record<string, string> = {
      'animals': 'Q1: Is it a mammal?\nA1: Yes\nQ2: Is it a wild animal?\nA2: Yes\nQ3: Is it larger than a dog?\nA3: Yes',
      'world leaders': 'Q1: Are they alive?\nA1: No\nQ2: Are they from Europe?\nA2: Yes\nQ3: Were they a president?\nA3: No',
      'objects': 'Q1: Is it electronic?\nA1: Yes\nQ2: Can you hold it?\nA2: Yes\nQ3: Is it a phone?\nA3: No'
    }
    return histories[category.toLowerCase()] || 'Basic conversation history'
  }

  private getMidGameQuestions(category: string): string[] {
    const questions: Record<string, string[]> = {
      'animals': ['Is it a mammal?', 'Is it a wild animal?', 'Is it larger than a dog?'],
      'world leaders': ['Are they alive?', 'Are they from Europe?', 'Were they a president?'],
      'objects': ['Is it electronic?', 'Can you hold it?', 'Is it a phone?']
    }
    return questions[category.toLowerCase()] || ['Basic question']
  }

  private getLateGameHistory(category: string): string {
    return this.getMidGameHistory(category) + '\nQ4: Additional context\nA4: Yes\nQ5: More context\nA5: No'
  }

  private getLateGameQuestions(category: string): string[] {
    return [...this.getMidGameQuestions(category), 'Additional question', 'More questions']
  }

  private getUncertainHistory(category: string): string {
    return 'Q1: Are they alive?\nA1: Don\'t know\nQ2: Are they from Europe?\nA2: Maybe\nQ3: Were they famous?\nA3: Don\'t know'
  }
}