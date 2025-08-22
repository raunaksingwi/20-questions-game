/**
 * Dedicated evaluator for testing semantic similarity detection in AI questioning.
 * Tests the system's ability to avoid asking the same question with different grammar.
 */

import { BaseEvaluator, EvaluationMetric, TestScenario } from './BaseEvaluator.ts'
import { SemanticSimilarityDetector } from './QuestioningEvaluator.ts'

export interface SemanticSimilarityTestScenario extends TestScenario {
  alreadyAskedQuestions: string[]
  testQuestions: Array<{
    question: string
    shouldBeFlagged: boolean // true if this should be detected as duplicate
    reason: string
  }>
  category: string
}

export class SemanticSimilarityEvaluator extends BaseEvaluator {
  constructor() {
    super('SemanticSimilarityEvaluator', 'semantic_similarity_detection')
  }

  protected async collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]> {
    const testScenario = scenario as SemanticSimilarityTestScenario
    const metrics: EvaluationMetric[] = []

    // Test each question for semantic similarity detection
    let correctDetections = 0
    let totalTests = testScenario.testQuestions.length

    for (const testCase of testScenario.testQuestions) {
      const isDetectedAsSimilar = testScenario.alreadyAskedQuestions.some(prevQ => 
        SemanticSimilarityDetector.areQuestionsSimilar(testCase.question, prevQ)
      )

      if (isDetectedAsSimilar === testCase.shouldBeFlagged) {
        correctDetections++
      } else {
        console.warn(`[SemanticSimilarityEvaluator] Detection mismatch for "${testCase.question}":`, {
          detected: isDetectedAsSimilar,
          expected: testCase.shouldBeFlagged,
          reason: testCase.reason
        })
      }
    }

    // Overall accuracy metric
    const accuracy = correctDetections / totalTests
    metrics.push(this.createMetric(
      'semantic_similarity_accuracy',
      accuracy,
      'Accuracy of semantic similarity detection',
      0.9
    ))

    // Test specific types of similarity
    metrics.push(...this.evaluateSimilarityTypes(testScenario))

    // Test false positive rate
    const falsePositiveRate = this.calculateFalsePositiveRate(testScenario)
    metrics.push(this.createMetric(
      'semantic_similarity_false_positive_rate',
      1 - falsePositiveRate, // Higher score = lower false positive rate
      'Rate of incorrectly flagging dissimilar questions as similar',
      0.85
    ))

    // Test false negative rate
    const falseNegativeRate = this.calculateFalseNegativeRate(testScenario)
    metrics.push(this.createMetric(
      'semantic_similarity_false_negative_rate',
      1 - falseNegativeRate, // Higher score = lower false negative rate
      'Rate of missing actually similar questions',
      0.95
    ))

    return metrics
  }

  private evaluateSimilarityTypes(scenario: SemanticSimilarityTestScenario): EvaluationMetric[] {
    const metrics: EvaluationMetric[] = []

    // Test synonym detection
    const synonymTests = scenario.testQuestions.filter(t => t.reason.includes('synonym'))
    if (synonymTests.length > 0) {
      const synonymAccuracy = this.calculateTypeAccuracy(scenario.alreadyAskedQuestions, synonymTests)
      metrics.push(this.createMetric(
        'synonym_detection_accuracy',
        synonymAccuracy,
        'Accuracy of detecting synonym-based similar questions',
        0.9
      ))
    }

    // Test grammatical variation detection
    const grammarTests = scenario.testQuestions.filter(t => t.reason.includes('grammar'))
    if (grammarTests.length > 0) {
      const grammarAccuracy = this.calculateTypeAccuracy(scenario.alreadyAskedQuestions, grammarTests)
      metrics.push(this.createMetric(
        'grammar_variation_detection_accuracy',
        grammarAccuracy,
        'Accuracy of detecting grammatical variations',
        0.85
      ))
    }

    // Test concept variation detection
    const conceptTests = scenario.testQuestions.filter(t => t.reason.includes('concept'))
    if (conceptTests.length > 0) {
      const conceptAccuracy = this.calculateTypeAccuracy(scenario.alreadyAskedQuestions, conceptTests)
      metrics.push(this.createMetric(
        'concept_variation_detection_accuracy',
        conceptAccuracy,
        'Accuracy of detecting concept-based variations',
        0.8
      ))
    }

    return metrics
  }

  private calculateTypeAccuracy(
    alreadyAsked: string[], 
    tests: Array<{question: string, shouldBeFlagged: boolean}>
  ): number {
    if (tests.length === 0) return 1

    let correct = 0
    for (const test of tests) {
      const detected = alreadyAsked.some(prevQ => 
        SemanticSimilarityDetector.areQuestionsSimilar(test.question, prevQ)
      )
      if (detected === test.shouldBeFlagged) {
        correct++
      }
    }

    return correct / tests.length
  }

  private calculateFalsePositiveRate(scenario: SemanticSimilarityTestScenario): number {
    const shouldNotBeFlagged = scenario.testQuestions.filter(t => !t.shouldBeFlagged)
    if (shouldNotBeFlagged.length === 0) return 0

    let falsePositives = 0
    for (const test of shouldNotBeFlagged) {
      const isDetectedAsSimilar = scenario.alreadyAskedQuestions.some(prevQ => 
        SemanticSimilarityDetector.areQuestionsSimilar(test.question, prevQ)
      )
      if (isDetectedAsSimilar) {
        falsePositives++
      }
    }

    return falsePositives / shouldNotBeFlagged.length
  }

  private calculateFalseNegativeRate(scenario: SemanticSimilarityTestScenario): number {
    const shouldBeFlagged = scenario.testQuestions.filter(t => t.shouldBeFlagged)
    if (shouldBeFlagged.length === 0) return 0

    let falseNegatives = 0
    for (const test of shouldBeFlagged) {
      const isDetectedAsSimilar = scenario.alreadyAskedQuestions.some(prevQ => 
        SemanticSimilarityDetector.areQuestionsSimilar(test.question, prevQ)
      )
      if (!isDetectedAsSimilar) {
        falseNegatives++
      }
    }

    return falseNegatives / shouldBeFlagged.length
  }

  /**
   * Creates comprehensive test scenarios for semantic similarity detection
   */
  static createTestScenarios(): SemanticSimilarityTestScenario[] {
    return [
      // World Leaders - European Male Leaders
      {
        name: 'semantic_world_leaders_european_male',
        description: 'Test semantic similarity detection for European male world leaders',
        category: 'world leaders',
        alreadyAskedQuestions: [
          'Are they from Europe?',
          'Are they male?',
          'Were they a president?',
          'Did they serve in wartime?'
        ],
        testQuestions: [
          // Should be flagged as similar
          {
            question: 'Are they European?',
            shouldBeFlagged: true,
            reason: 'synonym - European = from Europe'
          },
          {
            question: 'Do they come from Europe?',
            shouldBeFlagged: true,
            reason: 'grammar - different phrasing of "from Europe"'
          },
          {
            question: 'Were they born in Europe?',
            shouldBeFlagged: true,
            reason: 'concept - birth location relates to "from Europe"'
          },
          {
            question: 'Are they a man?',
            shouldBeFlagged: true,
            reason: 'synonym - man = male'
          },
          {
            question: 'Were they president?',
            shouldBeFlagged: true,
            reason: 'grammar - slight variation of "were they a president"'
          },
          {
            question: 'Did they serve as president?',
            shouldBeFlagged: true,
            reason: 'grammar - active voice of "were they president"'
          },
          {
            question: 'Did they lead during war?',
            shouldBeFlagged: true,
            reason: 'concept - similar to "serve in wartime"'
          },
          
          // Should NOT be flagged as similar
          {
            question: 'Are they alive?',
            shouldBeFlagged: false,
            reason: 'different concept - life status vs geography'
          },
          {
            question: 'Did they face impeachment?',
            shouldBeFlagged: false,
            reason: 'different concept - historical event vs role type'
          },
          {
            question: 'Did they win elections?',
            shouldBeFlagged: false,
            reason: 'different concept - electoral success vs role type'
          }
        ],
        input: {}
      },

      // Animals - Large Wild Carnivores
      {
        name: 'semantic_animals_large_wild_carnivores',
        description: 'Test semantic similarity detection for large wild carnivores',
        category: 'animals',
        alreadyAskedQuestions: [
          'Is it large?',
          'Is it wild?',
          'Does it eat meat?',
          'Is it a mammal?'
        ],
        testQuestions: [
          // Should be flagged as similar
          {
            question: 'Is it big?',
            shouldBeFlagged: true,
            reason: 'synonym - big = large'
          },
          {
            question: 'Is it huge?',
            shouldBeFlagged: true,
            reason: 'synonym - huge relates to large'
          },
          {
            question: 'Is it massive?',
            shouldBeFlagged: true,
            reason: 'synonym - massive relates to large'
          },
          {
            question: 'Is it untamed?',
            shouldBeFlagged: true,
            reason: 'synonym - untamed = wild'
          },
          {
            question: 'Is it feral?',
            shouldBeFlagged: true,
            reason: 'synonym - feral relates to wild'
          },
          {
            question: 'Is it carnivorous?',
            shouldBeFlagged: true,
            reason: 'concept - carnivorous = eats meat'
          },
          {
            question: 'Is it a predator?',
            shouldBeFlagged: true,
            reason: 'concept - predator implies meat eating'
          },
          
          // Should NOT be flagged as similar
          {
            question: 'Is it fast?',
            shouldBeFlagged: false,
            reason: 'different concept - speed vs size'
          },
          {
            question: 'Does it hibernate?',
            shouldBeFlagged: false,
            reason: 'different concept - hibernation behavior'
          },
          {
            question: 'Can it climb trees?',
            shouldBeFlagged: false,
            reason: 'different concept - climbing ability'
          },
          {
            question: 'Is it endangered?',
            shouldBeFlagged: false,
            reason: 'different concept - conservation status'
          }
        ],
        input: {}
      },

      // Objects - Electronic Handheld Devices
      {
        name: 'semantic_objects_electronic_handheld',
        description: 'Test semantic similarity detection for electronic handheld devices',
        category: 'objects',
        alreadyAskedQuestions: [
          'Is it electronic?',
          'Can you hold it?',
          'Do most people use it daily?',
          'Does it need electricity?'
        ],
        testQuestions: [
          // Should be flagged as similar
          {
            question: 'Is it digital?',
            shouldBeFlagged: true,
            reason: 'synonym - digital relates to electronic'
          },
          {
            question: 'Does it use electricity?',
            shouldBeFlagged: true,
            reason: 'concept - using electricity = needs electricity'
          },
          {
            question: 'Is it battery-powered?',
            shouldBeFlagged: true,
            reason: 'concept - batteries provide electricity'
          },
          {
            question: 'Is it handheld?',
            shouldBeFlagged: true,
            reason: 'concept - handheld = can hold'
          },
          {
            question: 'Is it portable?',
            shouldBeFlagged: true,
            reason: 'concept - portable relates to holdable'
          },
          {
            question: 'Can you carry it?',
            shouldBeFlagged: true,
            reason: 'synonym - carry = hold'
          },
          {
            question: 'Do people use it every day?',
            shouldBeFlagged: true,
            reason: 'grammar - rephrasing of "daily use"'
          },
          
          // Should NOT be flagged as similar
          {
            question: 'Is it expensive?',
            shouldBeFlagged: false,
            reason: 'different concept - cost vs functionality'
          },
          {
            question: 'Is it fragile?',
            shouldBeFlagged: false,
            reason: 'different concept - durability'
          },
          {
            question: 'Does it have a screen?',
            shouldBeFlagged: false,
            reason: 'different concept - specific feature'
          },
          {
            question: 'Is it made of plastic?',
            shouldBeFlagged: false,
            reason: 'different concept - material composition'
          }
        ],
        input: {}
      },

      // Cricket Players - Active Indian Batsmen
      {
        name: 'semantic_cricket_active_indian_batsmen',
        description: 'Test semantic similarity detection for active Indian cricket batsmen',
        category: 'cricket players',
        alreadyAskedQuestions: [
          'Are they currently active?',
          'Are they Indian?',
          'Are they a batsman?',
          'Have they been captain?'
        ],
        testQuestions: [
          // Should be flagged as similar
          {
            question: 'Are they still playing?',
            shouldBeFlagged: true,
            reason: 'concept - still playing = currently active'
          },
          {
            question: 'Do they play now?',
            shouldBeFlagged: true,
            reason: 'grammar - present tense variation of active'
          },
          {
            question: 'Are they from India?',
            shouldBeFlagged: true,
            reason: 'grammar - "from India" = "Indian"'
          },
          {
            question: 'Do they represent India?',
            shouldBeFlagged: true,
            reason: 'concept - representing India implies Indian nationality'
          },
          {
            question: 'Do they bat?',
            shouldBeFlagged: true,
            reason: 'grammar - verb form of "batsman"'
          },
          {
            question: 'Are they a batter?',
            shouldBeFlagged: true,
            reason: 'synonym - batter = batsman (modern term)'
          },
          {
            question: 'Were they captain?',
            shouldBeFlagged: true,
            reason: 'grammar - past tense vs present perfect'
          },
          {
            question: 'Did they captain the team?',
            shouldBeFlagged: true,
            reason: 'grammar - different verb form of captaincy'
          },
          
          // Should NOT be flagged as similar
          {
            question: 'Are they fast?',
            shouldBeFlagged: false,
            reason: 'different concept - speed vs role'
          },
          {
            question: 'Have they won awards?',
            shouldBeFlagged: false,
            reason: 'different concept - achievements vs current status'
          },
          {
            question: 'Are they tall?',
            shouldBeFlagged: false,
            reason: 'different concept - physical attribute'
          }
        ],
        input: {}
      },

      // Edge case: Complex grammatical variations
      {
        name: 'semantic_complex_grammar_variations',
        description: 'Test detection of complex grammatical variations',
        category: 'world leaders',
        alreadyAskedQuestions: [
          'Did they serve as president during wartime?',
          'Were they democratically elected?',
          'Did they face impeachment proceedings?'
        ],
        testQuestions: [
          // Should be flagged as similar
          {
            question: 'Were they president during a war?',
            shouldBeFlagged: true,
            reason: 'grammar - rearranged but same meaning'
          },
          {
            question: 'Did they hold the presidency in wartime?',
            shouldBeFlagged: true,
            reason: 'grammar - nominal vs verbal form'
          },
          {
            question: 'Were they elected by the people?',
            shouldBeFlagged: true,
            reason: 'concept - elected by people = democratically elected'
          },
          {
            question: 'Were impeachment proceedings initiated against them?',
            shouldBeFlagged: true,
            reason: 'grammar - active vs passive construction'
          },
          
          // Should NOT be flagged as similar  
          {
            question: 'Did they start any wars?',
            shouldBeFlagged: false,
            reason: 'different concept - starting vs serving during war'
          },
          {
            question: 'Were they popular with voters?',
            shouldBeFlagged: false,
            reason: 'different concept - popularity vs electoral process'
          },
          {
            question: 'Are they studied in schools?',
            shouldBeFlagged: false,
            reason: 'different concept - educational curriculum vs historical opinion'
          }
        ],
        input: {}
      }
    ]
  }
}