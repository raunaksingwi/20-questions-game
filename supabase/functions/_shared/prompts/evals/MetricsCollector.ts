/**
 * Comprehensive metrics collection system for evaluating 20 Questions game prompts.
 * Tracks game performance, question quality, and AI behavior patterns.
 */

import { EvaluationMetric } from './BaseEvaluator.ts'

export interface GameSessionMetrics {
  sessionId: string
  category: string
  mode: 'user_thinking' | 'ai_guessing'
  questionsAsked: number
  hintsUsed: number
  gameResult: 'ai_win' | 'user_win' | 'ongoing' | 'abandoned'
  durationMs: number
  conversationLength: number
}

export interface QuestionMetrics {
  questionText: string
  questionNumber: number
  informationGain: number
  isConcrete: boolean
  isBinary: boolean
  semanticSimilarityToPrevious: number
  answerType: 'yes' | 'no' | 'maybe' | 'unknown'
  responseTimeMs?: number
}

export interface PromptMetrics {
  promptType: string
  tokenLength: number
  readabilityScore: number
  coherenceScore: number
  specificityScore: number
  categoryAdherence: number
}

export class MetricsCollector {
  /**
   * Collects comprehensive game session metrics
   */
  static collectGameSessionMetrics(
    sessionData: any,
    messages: any[],
    startTime: Date,
    endTime: Date
  ): GameSessionMetrics {
    return {
      sessionId: sessionData.id,
      category: sessionData.category,
      mode: sessionData.mode,
      questionsAsked: sessionData.questions_asked || 0,
      hintsUsed: sessionData.hints_used || 0,
      gameResult: this.determineGameResult(sessionData, messages),
      durationMs: endTime.getTime() - startTime.getTime(),
      conversationLength: messages.length
    }
  }

  /**
   * Analyzes question quality metrics
   */
  static collectQuestionMetrics(
    question: string,
    questionNumber: number,
    previousQuestions: string[],
    categoryItems: string[],
    yesItems: string[] = [],
    noItems: string[] = []
  ): QuestionMetrics {
    return {
      questionText: question,
      questionNumber,
      informationGain: this.calculateInformationGain(categoryItems, yesItems, noItems),
      isConcrete: this.isConcrete(question),
      isBinary: this.isBinaryQuestion(question),
      semanticSimilarityToPrevious: this.calculateMaxSimilarity(question, previousQuestions),
      answerType: 'unknown' // Will be filled when answer is received
    }
  }

  /**
   * Evaluates prompt structure and quality
   */
  static collectPromptMetrics(promptText: string, promptType: string): PromptMetrics {
    return {
      promptType,
      tokenLength: this.estimateTokenLength(promptText),
      readabilityScore: this.calculateReadabilityScore(promptText),
      coherenceScore: this.calculateCoherenceScore(promptText),
      specificityScore: this.calculateSpecificityScore(promptText),
      categoryAdherence: this.calculateCategoryAdherence(promptText, promptType)
    }
  }

  /**
   * Comprehensive response quality evaluation
   */
  static collectResponseQualityMetrics(
    response: string,
    expectedFormat: string,
    context: any
  ): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Format compliance
    metrics.push({
      name: 'format_compliance',
      value: this.checkFormatCompliance(response, expectedFormat),
      description: 'How well response follows expected format',
      threshold: 0.9
    })

    // Length appropriateness
    const lengthScore = this.evaluateResponseLength(response, expectedFormat)
    metrics.push({
      name: 'length_appropriateness',
      value: lengthScore,
      description: 'Whether response length is appropriate for context',
      threshold: 0.7
    })

    // Content relevance
    metrics.push({
      name: 'content_relevance',
      value: this.evaluateContentRelevance(response, context),
      description: 'How relevant response is to game context',
      threshold: 0.8
    })

    // Repetition avoidance
    if (context.previousResponses) {
      metrics.push({
        name: 'repetition_avoidance',
        value: this.calculateRepetitionAvoidance(response, context.previousResponses),
        description: 'How well response avoids repeating previous content',
        threshold: 0.8
      })
    }

    return metrics
  }

  // ========== PRIVATE HELPER METHODS ==========

  private static determineGameResult(sessionData: any, messages: any[]): string {
    if (sessionData.status === 'completed') {
      if (sessionData.winner === 'ai') return 'ai_win'
      if (sessionData.winner === 'user') return 'user_win'
    }
    if (sessionData.status === 'abandoned') return 'abandoned'
    return 'ongoing'
  }

  private static calculateInformationGain(
    allItems: string[],
    yesItems: string[],
    noItems: string[]
  ): number {
    if (allItems.length <= 1) return 0
    
    const total = allItems.length
    const yesCount = yesItems.length
    const noCount = noItems.length
    
    if (yesCount === 0 || noCount === 0) return 0
    
    // Calculate entropy before and after split
    const entropyBefore = 1 // Uniform distribution assumption
    const yesProb = yesCount / total
    const noProb = noCount / total
    
    if (yesProb === 0 || noProb === 0) return 0
    
    const entropyAfter = -(yesProb * Math.log2(yesProb) + noProb * Math.log2(noProb))
    return entropyBefore - entropyAfter
  }

  private static isConcrete(question: string): boolean {
    const vaguePatterns = [
      /unique characteristics/i, /special characteristics/i, /multiple forms/i,
      /variations/i, /specific region or time period/i, /notable aspects/i,
      /particular qualities/i, /distinctive features/i, /any unique/i,
      /any special/i, /specific attributes/i, /generally/i, /typically/i,
      /usually/i, /commonly/i, /mostly/i, /often/i
    ]
    
    return !vaguePatterns.some(pattern => pattern.test(question))
  }

  private static isBinaryQuestion(question: string): boolean {
    if (/\bor\b/i.test(question)) return false
    if (!question.endsWith('?')) return false
    
    const binaryStarters = [
      /^is\s/i, /^are\s/i, /^does\s/i, /^do\s/i, /^can\s/i, /^will\s/i,
      /^would\s/i, /^has\s/i, /^have\s/i, /^did\s/i, /^was\s/i, /^were\s/i
    ]
    
    return binaryStarters.some(pattern => pattern.test(question))
  }

  private static calculateMaxSimilarity(question: string, previousQuestions: string[]): number {
    if (previousQuestions.length === 0) return 0
    
    const normalize = (q: string) => q.toLowerCase().replace(/[^\w\s]/g, '').trim()
    const currentNorm = normalize(question)
    
    let maxSimilarity = 0
    for (const prevQ of previousQuestions) {
      const prevNorm = normalize(prevQ)
      const similarity = this.calculateStringSimilarity(currentNorm, prevNorm)
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }
    
    return maxSimilarity
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' ').filter(w => w.length > 2))
    const words2 = new Set(str2.split(' ').filter(w => w.length > 2))
    
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private static estimateTokenLength(text: string): number {
    // Rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private static calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = text.split(/\s+/).filter(w => w.length > 0)
    
    if (sentences.length === 0 || words.length === 0) return 0
    
    const avgWordsPerSentence = words.length / sentences.length
    const avgCharsPerWord = text.replace(/\s/g, '').length / words.length
    
    // Flesch reading ease approximation (normalized to 0-1)
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (avgCharsPerWord / 100))
    return Math.max(0, Math.min(1, score / 100))
  }

  private static calculateCoherenceScore(text: string): number {
    const logicalConnectors = ['because', 'therefore', 'however', 'since', 'given', 'based on', 'thus', 'hence']
    const hasLogicalFlow = logicalConnectors.some(connector => 
      text.toLowerCase().includes(connector)
    )
    
    const words = text.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const lexicalDiversity = uniqueWords.size / words.length
    
    return (hasLogicalFlow ? 0.4 : 0) + Math.min(lexicalDiversity * 0.6, 0.6)
  }

  private static calculateSpecificityScore(text: string): number {
    // Count specific vs vague terms
    const specificTerms = ['specific', 'exactly', 'precisely', 'particular', 'concrete']
    const vagueTerms = ['generally', 'usually', 'typically', 'sometimes', 'maybe', 'perhaps']
    
    const specificCount = specificTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length
    
    const vagueCount = vagueTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length
    
    const totalTerms = specificCount + vagueCount
    if (totalTerms === 0) return 0.5 // Neutral if no indicators
    
    return specificCount / totalTerms
  }

  private static calculateCategoryAdherence(text: string, promptType: string): number {
    // Category-specific keyword analysis
    const categoryKeywords: Record<string, string[]> = {
      'animals': ['mammal', 'wild', 'domestic', 'carnivore', 'herbivore', 'habitat', 'species'],
      'objects': ['electronic', 'material', 'portable', 'handheld', 'tool', 'furniture'],
      'world_leaders': ['political', 'leader', 'president', 'minister', 'country', 'government'],
      'sports_players': ['team', 'player', 'active', 'retired', 'championship', 'position']
    }
    
    const keywords = categoryKeywords[promptType.toLowerCase()] || []
    if (keywords.length === 0) return 1 // No specific requirements
    
    const matchedKeywords = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    )
    
    return matchedKeywords.length / keywords.length
  }

  private static checkFormatCompliance(response: string, expectedFormat: string): number {
    switch (expectedFormat) {
      case 'question':
        return response.trim().endsWith('?') ? 1 : 0
      case 'hint':
        return (response.length > 10 && response.length < 200) ? 1 : 0
      case 'guess':
        return response.toLowerCase().includes('is it') ? 1 : 0
      default:
        return 1 // No specific format requirements
    }
  }

  private static evaluateResponseLength(response: string, expectedFormat: string): number {
    const length = response.length
    
    const idealLengths: Record<string, { min: number, max: number, ideal: number }> = {
      'question': { min: 10, max: 100, ideal: 30 },
      'hint': { min: 20, max: 200, ideal: 80 },
      'guess': { min: 8, max: 50, ideal: 20 },
      'system_prompt': { min: 100, max: 2000, ideal: 800 }
    }
    
    const target = idealLengths[expectedFormat] || { min: 10, max: 500, ideal: 100 }
    
    if (length < target.min) return length / target.min
    if (length > target.max) return target.max / length
    
    // Gaussian scoring around ideal length
    const deviation = Math.abs(length - target.ideal) / target.ideal
    return Math.exp(-deviation * deviation)
  }

  private static evaluateContentRelevance(response: string, context: any): number {
    if (!context) return 0.5
    
    let relevanceScore = 0.5 // Base score
    
    // Check for category relevance
    if (context.category) {
      const categoryTerms = this.getCategoryTerms(context.category)
      const hasRelevantTerms = categoryTerms.some(term => 
        response.toLowerCase().includes(term)
      )
      if (hasRelevantTerms) relevanceScore += 0.3
    }
    
    // Check for game state awareness
    if (context.gameState) {
      if (context.gameState.questionsAsked > 10 && response.includes('specific')) {
        relevanceScore += 0.2 // Good late-game specificity
      }
    }
    
    return Math.min(1, relevanceScore)
  }

  private static calculateRepetitionAvoidance(response: string, previousResponses: string[]): number {
    if (previousResponses.length === 0) return 1
    
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim()
    const currentNorm = normalize(response)
    
    let maxSimilarity = 0
    for (const prev of previousResponses) {
      const prevNorm = normalize(prev)
      const similarity = this.calculateStringSimilarity(currentNorm, prevNorm)
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }
    
    return 1 - maxSimilarity // Higher score for less similarity
  }

  private static getCategoryTerms(category: string): string[] {
    const terms: Record<string, string[]> = {
      'animals': ['animal', 'mammal', 'wild', 'domestic', 'carnivore', 'herbivore'],
      'objects': ['object', 'electronic', 'material', 'portable', 'tool'],
      'world leaders': ['leader', 'political', 'president', 'minister', 'country'],
      'cricket players': ['cricket', 'batsman', 'bowler', 'captain', 'team'],
      'football players': ['football', 'quarterback', 'offense', 'defense', 'super bowl'],
      'nba players': ['basketball', 'nba', 'guard', 'center', 'forward', 'championship']
    }
    
    return terms[category.toLowerCase()] || []
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' ').filter(w => w.length > 2))
    const words2 = new Set(str2.split(' ').filter(w => w.length > 2))
    
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
}

/**
 * Performance benchmarking utilities for prompt evaluation
 */
export class PerformanceBenchmarks {
  /**
   * Standard benchmarks for different prompt types
   */
  static readonly BENCHMARKS = {
    questioning: {
      informationGain: { min: 0.3, target: 0.5, max: 1.0 },
      questionQuality: { min: 0.7, target: 0.85, max: 1.0 },
      semanticDiversity: { min: 0.6, target: 0.8, max: 1.0 },
      convergenceRate: { min: 0.4, target: 0.7, max: 1.0 }
    },
    
    guessing: {
      factAccuracy: { min: 0.8, target: 0.95, max: 1.0 },
      deductionQuality: { min: 0.7, target: 0.85, max: 1.0 },
      domainAdherence: { min: 0.9, target: 0.95, max: 1.0 },
      redundancyPrevention: { min: 0.8, target: 0.9, max: 1.0 }
    },
    
    hinting: {
      noveltyScore: { min: 0.7, target: 0.85, max: 1.0 },
      consistencyRate: { min: 0.9, target: 0.95, max: 1.0 },
      helpfulnessScore: { min: 0.6, target: 0.8, max: 1.0 },
      spoilerAvoidance: { min: 0.95, target: 0.99, max: 1.0 }
    }
  }

  /**
   * Evaluates performance against benchmarks
   */
  static evaluateAgainstBenchmarks(
    promptType: keyof typeof PerformanceBenchmarks.BENCHMARKS,
    metrics: Record<string, number>
  ): EvaluationMetric[] {
    const benchmarks = this.BENCHMARKS[promptType]
    const results: EvaluationMetric[] = []
    
    for (const [metricName, value] of Object.entries(metrics)) {
      const benchmark = benchmarks[metricName as keyof typeof benchmarks]
      if (benchmark) {
        const score = this.calculateBenchmarkScore(value, benchmark)
        results.push({
          name: `${metricName}_benchmark`,
          value: score,
          description: `Performance vs benchmark for ${metricName}`,
          threshold: 0.7
        })
      }
    }
    
    return results
  }

  private static calculateBenchmarkScore(
    value: number,
    benchmark: { min: number, target: number, max: number }
  ): number {
    if (value >= benchmark.target) {
      // Above target: scale from target to max
      const range = benchmark.max - benchmark.target
      const position = Math.min(value - benchmark.target, range)
      return 0.8 + (position / range) * 0.2 // 0.8 to 1.0
    } else {
      // Below target: scale from min to target
      const range = benchmark.target - benchmark.min
      const position = Math.max(value - benchmark.min, 0)
      return (position / range) * 0.8 // 0.0 to 0.8
    }
  }
}