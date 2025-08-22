/**
 * Comprehensive Question Validator that combines:
 * 1. Enhanced LLM prompts (primary prevention)
 * 2. LLM-based similarity checking (runtime validation)  
 * 3. Manual hardcoded detection (backup validation)
 */

import { SemanticSimilarityDetector } from '../prompts/evals/QuestioningEvaluator.ts'
import { LLMSemanticSimilarityChecker, SimilarityCheckResult } from './LLMSemanticSimilarityChecker.ts'

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  confidence: number
  suggestedAlternative?: string
}

export interface ValidationIssue {
  type: 'semantic_duplicate' | 'category_contamination' | 'logical_redundancy'
  severity: 'critical' | 'warning'
  description: string
  conflictsWith?: string
}

export class ComprehensiveQuestionValidator {
  private llmChecker: LLMSemanticSimilarityChecker
  private enableLLMChecking: boolean

  constructor(enableLLMChecking: boolean = true) {
    this.enableLLMChecking = enableLLMChecking
    this.llmChecker = new LLMSemanticSimilarityChecker()
  }

  /**
   * Comprehensive validation of a new question
   */
  async validateQuestion(
    newQuestion: string,
    previousQuestions: string[],
    category: string,
    confirmedFacts: Array<{question: string, answer: string}>
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = []

    // 1. Category contamination check (critical)
    const categoryIssues = this.checkCategoryContamination(newQuestion, category)
    issues.push(...categoryIssues)

    // 2. Manual semantic similarity check (fast baseline)
    const manualSimilarityIssues = this.checkManualSimilarity(newQuestion, previousQuestions)
    issues.push(...manualSimilarityIssues)

    // 3. Logical redundancy check
    const redundancyIssues = this.checkLogicalRedundancy(newQuestion, confirmedFacts)
    issues.push(...redundancyIssues)

    // 4. LLM-based similarity check (if enabled and no critical issues found)
    let llmResult: SimilarityCheckResult | null = null
    if (this.enableLLMChecking && !issues.some(i => i.severity === 'critical')) {
      try {
        llmResult = await this.llmChecker.checkQuestionSimilarity(
          newQuestion, 
          previousQuestions, 
          category
        )
        
        if (llmResult.isSimilar) {
          issues.push({
            type: 'semantic_duplicate',
            severity: 'critical',
            description: `LLM detected semantic similarity: ${llmResult.reasoning}`,
            conflictsWith: 'Previous questions'
          })
        }
      } catch (error) {
        console.warn('LLM similarity check failed, using manual fallback:', error)
      }
    }

    // Determine overall validity
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    const isValid = criticalIssues.length === 0

    // Calculate confidence score
    let confidence = 0.8 // Base confidence
    if (llmResult) {
      confidence = llmResult.isSimilar ? llmResult.confidence : (1 - llmResult.confidence)
    }
    if (manualSimilarityIssues.length > 0) confidence *= 0.9
    if (categoryIssues.length > 0) confidence *= 0.5

    return {
      isValid,
      issues,
      confidence,
      suggestedAlternative: llmResult?.suggestedAlternative
    }
  }

  /**
   * Check for category contamination (animals/objects/people boundaries)
   */
  private checkCategoryContamination(question: string, category: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const lowerQuestion = question.toLowerCase()

    const contaminationPatterns = {
      animals: {
        forbidden: [
          { pattern: /are they alive/, reason: 'All animals are alive by definition' },
          { pattern: /are they human/, reason: 'Humans are not in the animals category' },
          { pattern: /do they have a job|are they employed|are they retired/, reason: 'Animals do not have careers' },
          { pattern: /are they (famous|celebrities|politicians|wealthy)/, reason: 'Animals do not have human social status' },
          { pattern: /are they married|do they have children/, reason: 'Animals do not have human family structures' },
          { pattern: /do they speak|do they have a college degree|are they educated/, reason: 'Animals do not have human education/language' },
          { pattern: /were they born in \d{4}|are they over \d+/, reason: 'Animals do not have human-style ages/birth years' },
          { pattern: /are they electronic|are they digital|are they manufactured/, reason: 'Animals are biological, not technological' },
          { pattern: /are they made of (metal|plastic|wood)/, reason: 'Animals are not manufactured' },
          { pattern: /do they need (electricity|batteries|power)/, reason: 'Animals do not require power sources' },
          { pattern: /are they (expensive|waterproof|tools)/, reason: 'Animals are not commercial products' },
          { pattern: /do they have screens|do they break easily/, reason: 'Animals do not have technological features' },
          { pattern: /do they (drive|use computers|watch tv|cook food|wear clothes|read books)/, reason: 'Animals do not perform human activities' }
        ]
      },
      objects: {
        forbidden: [
          { pattern: /are they alive|do they live/, reason: 'Objects are not living entities' },
          { pattern: /do they (eat|breathe|sleep|reproduce|grow|age|die)/, reason: 'Objects do not have biological functions' },
          { pattern: /are they (born|conscious)|do they (have parents|feel pain|have emotions|think)/, reason: 'Objects do not have biological/cognitive attributes' },
          { pattern: /are they (male|female)|do they have gender/, reason: 'Objects do not have gender' },
          { pattern: /do they have (children|babies|offspring|names)/, reason: 'Objects do not reproduce or have personal identity' },
          { pattern: /were they born|when were they born/, reason: 'Objects are manufactured, not born' },
          { pattern: /are they married|do they have (family|jobs)/, reason: 'Objects do not have relationships or careers' },
          { pattern: /are they (famous|educated)|do they (speak|vote)/, reason: 'Objects do not have social/political attributes' },
          { pattern: /do they (hunt|migrate|hibernate)/, reason: 'Objects do not have animal behaviors' },
          { pattern: /are they (wild|predators|carnivorous|domesticated|nocturnal)/, reason: 'Objects do not have animal characteristics' },
          { pattern: /do they (mate|have territories)/, reason: 'Objects do not have animal behaviors' }
        ]
      },
      people: {
        forbidden: [
          { pattern: /are they alive/, reason: 'All people are alive by definition (redundant question)' },
          { pattern: /do they (hibernate|migrate|molt)/, reason: 'People do not have animal behaviors' },
          { pattern: /are they (domesticated|wild|predators|nocturnal)/, reason: 'People are not animals' },
          { pattern: /do they have (fur|claws)|do they lay eggs|can they fly/, reason: 'People do not have animal physical features' },
          { pattern: /are they mammals|do they live in packs|are they territorial/, reason: 'People are not classified as animals in this context' },
          { pattern: /do they hunt(?! for)/, reason: 'People do not hunt prey like animals (unless hunting for sport/food)' },
          { pattern: /are they made of (metal|plastic|wood)/, reason: 'People are biological, not manufactured' },
          { pattern: /do they need (electricity|batteries|power)|are they electronic/, reason: 'People are not electronic devices' },
          { pattern: /are they (manufactured|waterproof|digital)/, reason: 'People are not technological objects' },
          { pattern: /do they (break|have circuits|have screens)/, reason: 'People do not have technological features' },
          { pattern: /are they tools|are they expensive to buy/, reason: 'People are not commercial products' },
          { pattern: /are they carnivorous|do they hunt prey/, reason: 'Use dietary questions appropriate for people' },
          { pattern: /do they eat meat/, reason: 'Use appropriate dietary questions for people (e.g., "What is their diet?")' },
          { pattern: /do they breathe|do they have blood|are they human/, reason: 'Redundant - all people breathe/have blood/are human by definition' }
        ]
      }
    }

    // Check category-specific patterns
    let categoryKey = category.toLowerCase()
    
    // Map similar categories to main categories
    if (categoryKey.includes('leader') || categoryKey.includes('player') || categoryKey.includes('people')) {
      categoryKey = 'people'
    } else if (categoryKey.includes('animal')) {
      categoryKey = 'animals'  
    } else if (categoryKey.includes('object')) {
      categoryKey = 'objects'
    }
    
    const categoryPatterns = contaminationPatterns[categoryKey as keyof typeof contaminationPatterns]
    if (categoryPatterns) {
      for (const { pattern, reason } of categoryPatterns.forbidden) {
        if (pattern.test(lowerQuestion)) {
          issues.push({
            type: 'category_contamination',
            severity: 'critical',
            description: `Category violation for ${category}: ${reason}`,
            conflictsWith: question
          })
        }
      }
    }

    return issues
  }

  /**
   * Manual semantic similarity check using hardcoded patterns
   */
  private checkManualSimilarity(newQuestion: string, previousQuestions: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    for (const prevQuestion of previousQuestions) {
      if (SemanticSimilarityDetector.areQuestionsSimilar(newQuestion, prevQuestion)) {
        issues.push({
          type: 'semantic_duplicate',
          severity: 'critical',
          description: `Semantically similar to previous question: "${prevQuestion}"`,
          conflictsWith: prevQuestion
        })
        break // Only report first conflict to avoid spam
      }
    }

    return issues
  }

  /**
   * Check if question can be logically deduced from existing facts
   */
  private checkLogicalRedundancy(
    newQuestion: string, 
    confirmedFacts: Array<{question: string, answer: string}>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const lowerQuestion = newQuestion.toLowerCase()

    // Logical deduction patterns
    const deductionRules = [
      {
        condition: (facts: typeof confirmedFacts) => 
          facts.some(f => f.question.toLowerCase().includes('mammal') && f.answer === 'yes'),
        implies: ['warm-blooded', 'vertebrate', 'have fur or hair'],
        description: 'If it\'s a mammal, certain properties are automatically true'
      },
      {
        condition: (facts: typeof confirmedFacts) => 
          facts.some(f => f.question.toLowerCase().includes('electronic') && f.answer === 'yes'),
        implies: ['uses electricity', 'has circuits', 'needs power'],
        description: 'If it\'s electronic, certain properties are automatically true'
      },
      {
        condition: (facts: typeof confirmedFacts) => 
          facts.some(f => f.question.toLowerCase().includes('president') && f.answer === 'yes'),
        implies: ['political leader', 'government role', 'elected position'],
        description: 'If they were president, certain roles are automatically true'
      }
    ]

    for (const rule of deductionRules) {
      if (rule.condition(confirmedFacts)) {
        for (const impliedProperty of rule.implies) {
          if (lowerQuestion.includes(impliedProperty.toLowerCase())) {
            issues.push({
              type: 'logical_redundancy',
              severity: 'warning',
              description: `${rule.description}: "${impliedProperty}" can be deduced`,
              conflictsWith: newQuestion
            })
          }
        }
      }
    }

    return issues
  }

  /**
   * Batch validate multiple questions (useful for testing)
   */
  async batchValidateQuestions(
    questions: string[],
    previousQuestions: string[],
    category: string,
    confirmedFacts: Array<{question: string, answer: string}> = []
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []
    
    for (let i = 0; i < questions.length; i++) {
      const currentPrevious = [...previousQuestions, ...questions.slice(0, i)]
      const result = await this.validateQuestion(
        questions[i], 
        currentPrevious, 
        category, 
        confirmedFacts
      )
      results.push(result)
    }
    
    return results
  }

  /**
   * Get validation statistics for analysis
   */
  static getValidationStats(results: ValidationResult[]): {
    totalQuestions: number
    validQuestions: number
    invalidQuestions: number
    semanticDuplicates: number
    categoryViolations: number
    logicalRedundancies: number
    averageConfidence: number
  } {
    return {
      totalQuestions: results.length,
      validQuestions: results.filter(r => r.isValid).length,
      invalidQuestions: results.filter(r => !r.isValid).length,
      semanticDuplicates: results.filter(r => 
        r.issues.some(i => i.type === 'semantic_duplicate')
      ).length,
      categoryViolations: results.filter(r => 
        r.issues.some(i => i.type === 'category_contamination')
      ).length,
      logicalRedundancies: results.filter(r => 
        r.issues.some(i => i.type === 'logical_redundancy')
      ).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    }
  }
}