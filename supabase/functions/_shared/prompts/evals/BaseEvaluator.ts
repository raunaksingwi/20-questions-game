/**
 * Base evaluation framework for measuring prompt performance in the 20 Questions game.
 * Provides core metrics, test structure, and evaluation patterns.
 */

export interface EvaluationMetric {
  name: string
  value: number
  description: string
  threshold?: number
  passed?: boolean
}

export interface EvaluationResult {
  evaluatorName: string
  promptType: string
  testScenario: string
  metrics: EvaluationMetric[]
  overallScore: number
  passed: boolean
  timestamp: Date
  executionTimeMs: number
  details?: Record<string, any>
}

export interface TestScenario {
  name: string
  description: string
  input: any
  expectedOutput?: any
  validationFn?: (output: any) => boolean
}

export abstract class BaseEvaluator {
  protected evaluatorName: string
  protected promptType: string

  constructor(evaluatorName: string, promptType: string) {
    this.evaluatorName = evaluatorName
    this.promptType = promptType
  }

  /**
   * Runs evaluation on a single test scenario
   */
  async evaluateScenario(scenario: TestScenario): Promise<EvaluationResult> {
    const startTime = Date.now()
    
    try {
      const metrics = await this.collectMetrics(scenario)
      const overallScore = this.calculateOverallScore(metrics)
      const passed = this.evaluatePassThreshold(metrics, overallScore)
      
      return {
        evaluatorName: this.evaluatorName,
        promptType: this.promptType,
        testScenario: scenario.name,
        metrics,
        overallScore,
        passed,
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      }
    } catch (error) {
      return {
        evaluatorName: this.evaluatorName,
        promptType: this.promptType,
        testScenario: scenario.name,
        metrics: [{
          name: 'evaluation_error',
          value: 0,
          description: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
          passed: false
        }],
        overallScore: 0,
        passed: false,
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Runs evaluation across multiple test scenarios
   */
  async evaluateAll(scenarios: TestScenario[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = []
    
    for (const scenario of scenarios) {
      const result = await this.evaluateScenario(scenario)
      results.push(result)
    }
    
    return results
  }

  /**
   * Collects all metrics for a given test scenario
   */
  protected abstract collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]>

  /**
   * Calculates overall score from individual metrics
   */
  protected calculateOverallScore(metrics: EvaluationMetric[]): number {
    if (metrics.length === 0) return 0
    
    const validMetrics = metrics.filter(m => m.value !== undefined && !isNaN(m.value))
    if (validMetrics.length === 0) return 0
    
    // Weighted average - most metrics are equally weighted
    const totalScore = validMetrics.reduce((sum, metric) => sum + metric.value, 0)
    return Math.round((totalScore / validMetrics.length) * 100) / 100
  }

  /**
   * Determines if evaluation passes based on metrics and thresholds
   */
  protected evaluatePassThreshold(metrics: EvaluationMetric[], overallScore: number): boolean {
    // Check if any critical metrics failed their thresholds
    const criticalFailures = metrics.filter(m => 
      m.threshold !== undefined && m.value < m.threshold
    )
    
    if (criticalFailures.length > 0) return false
    
    // Overall score threshold
    return overallScore >= 0.7 // 70% overall threshold
  }

  /**
   * Creates a metric with automatic pass/fail evaluation
   */
  protected createMetric(
    name: string, 
    value: number, 
    description: string, 
    threshold?: number
  ): EvaluationMetric {
    return {
      name,
      value,
      description,
      threshold,
      passed: threshold !== undefined ? value >= threshold : undefined
    }
  }

  /**
   * Normalizes a score to 0-1 range
   */
  protected normalizeScore(value: number, min: number, max: number): number {
    if (max === min) return 1
    return Math.max(0, Math.min(1, (value - min) / (max - min)))
  }

  /**
   * Calculates Jaccard similarity between two sets of strings
   */
  protected calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1.map(s => s.toLowerCase().trim()))
    const s2 = new Set(set2.map(s => s.toLowerCase().trim()))
    
    const intersection = new Set([...s1].filter(x => s2.has(x)))
    const union = new Set([...s1, ...s2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Validates response format and structure
   */
  protected validateResponseFormat(response: string, expectedFormat: RegExp | string): boolean {
    if (typeof expectedFormat === 'string') {
      return response.toLowerCase().includes(expectedFormat.toLowerCase())
    }
    return expectedFormat.test(response)
  }

  /**
   * Measures semantic coherence using keyword density and logical flow
   */
  protected measureSemanticCoherence(text: string): number {
    // Simple coherence metrics
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length === 0) return 0
    
    // Check for logical flow indicators
    const logicalConnectors = ['because', 'therefore', 'however', 'since', 'given', 'based on']
    const hasLogicalFlow = logicalConnectors.some(connector => 
      text.toLowerCase().includes(connector)
    )
    
    // Check for repetitive patterns (negative indicator)
    const words = text.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const lexicalDiversity = uniqueWords.size / words.length
    
    // Combine metrics
    const flowScore = hasLogicalFlow ? 0.3 : 0
    const diversityScore = Math.min(lexicalDiversity * 0.7, 0.7)
    
    return flowScore + diversityScore
  }
}

/**
 * Utility class for common evaluation operations
 */
export class EvaluationUtils {
  /**
   * Extracts questions from conversation text
   */
  static extractQuestions(text: string): string[] {
    const lines = text.split('\n')
    const questions: string[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.endsWith('?') && trimmed.length > 5) {
        // Remove prefixes like "Q1:", "Question:", etc.
        const cleaned = trimmed.replace(/^[QA]\d*:?\s*|^Question:?\s*|^Answer:?\s*/i, '')
        if (cleaned.length > 5) {
          questions.push(cleaned)
        }
      }
    }
    
    return questions
  }

  /**
   * Calculates information gain for a binary question
   */
  static calculateInformationGain(
    remainingItems: string[],
    yesItems: string[],
    noItems: string[]
  ): number {
    if (remainingItems.length <= 1) return 0
    
    const totalItems = remainingItems.length
    const yesCount = yesItems.length
    const noCount = noItems.length
    
    if (yesCount === 0 || noCount === 0) return 0 // No split
    
    // Entropy before split
    const entropyBefore = 1 // Assuming uniform distribution
    
    // Entropy after split
    const yesProb = yesCount / totalItems
    const noProb = noCount / totalItems
    const entropyAfter = -(yesProb * Math.log2(yesProb) + noProb * Math.log2(noProb))
    
    return entropyBefore - entropyAfter
  }

  /**
   * Checks if a question is concrete vs vague
   */
  static isConcrete(question: string): boolean {
    const vaguePatterns = [
      /unique characteristics/i,
      /special characteristics/i,
      /multiple forms/i,
      /variations/i,
      /specific region or time period/i,
      /notable aspects/i,
      /particular qualities/i,
      /distinctive features/i,
      /any unique/i,
      /any special/i,
      /specific attributes/i,
      /generally/i,
      /typically/i,
      /usually/i,
      /commonly/i,
      /mostly/i,
      /often/i
    ]
    
    return !vaguePatterns.some(pattern => pattern.test(question))
  }

  /**
   * Validates if question is binary (yes/no answerable)
   */
  static isBinaryQuestion(question: string): boolean {
    // Should not contain "or" for multiple choice
    if (/\bor\b/i.test(question)) return false
    
    // Should end with question mark
    if (!question.endsWith('?')) return false
    
    // Should start with common binary question starters
    const binaryStarters = [
      /^is\s/i, /^are\s/i, /^does\s/i, /^do\s/i, /^can\s/i, /^will\s/i,
      /^would\s/i, /^has\s/i, /^have\s/i, /^did\s/i, /^was\s/i, /^were\s/i
    ]
    
    return binaryStarters.some(pattern => pattern.test(question))
  }
}