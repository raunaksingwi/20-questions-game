/**
 * Comprehensive test scenarios for evaluating all prompt types in the 20 Questions game.
 * Provides golden test sets, edge cases, and performance benchmarks.
 */

import { QuestioningTestScenario } from './QuestioningEvaluator.ts'
import { GuessingTestScenario } from './GuessingEvaluator.ts'
import { HintTestScenario } from './HintEvaluator.ts'
import { FactsByAnswer } from '../AIGuessingPromptBuilder.ts'
import { TestScenario } from './BaseEvaluator.ts'

/**
 * Extended test scenario interface for factual accuracy testing
 */
export interface FactualTestScenario extends TestScenario {
  secretItem: string
  category: string
  factualQuestions: Array<{
    question: string
    expectedAnswer: string
    reasoning: string
  }>
  ambiguousQuestions?: string[]
}

/**
 * Golden test sets for each category with known optimal question progressions
 */
export class GoldenTestSets {
  /**
   * Creates golden test scenarios for AI questioning templates
   */
  static createQuestioningGoldenTests(): QuestioningTestScenario[] {
    return [
      // Animals Category - Golden Path
      {
        name: 'animals_golden_lion',
        description: 'Optimal questioning path for discovering a lion',
        category: 'animals',
        questionsAsked: 3,
        conversationHistory: 'Q1: Is it a mammal?\nA1: Yes\nQ2: Is it a wild animal?\nA2: Yes\nQ3: Is it larger than a dog?\nA3: Yes',
        alreadyAskedQuestions: ['Is it a mammal?', 'Is it a wild animal?', 'Is it larger than a dog?'],
        expectedQuestionType: 'habitat_or_diet',
        input: {}
      },

      // Animals Category - Bird Path
      {
        name: 'animals_golden_eagle',
        description: 'Optimal questioning path for discovering an eagle',
        category: 'animals',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it alive?\nA1: Yes\nQ2: Is it a bird?\nA2: Yes\nQ3: Can it fly?\nA3: Yes\nQ4: Is it a predator?\nA4: Yes',
        alreadyAskedQuestions: ['Is it alive?', 'Is it a bird?', 'Can it fly?', 'Is it a predator?'],
        expectedQuestionType: 'habitat_or_size',
        input: {}
      },

      // Animals Category - Aquatic Path
      {
        name: 'animals_golden_whale',
        description: 'Optimal questioning path for discovering a whale',
        category: 'animals',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it alive?\nA1: Yes\nQ2: Does it live in water?\nA2: Yes\nQ3: Is it large?\nA3: Yes\nQ4: Is it a mammal?\nA4: Yes',
        alreadyAskedQuestions: ['Is it alive?', 'Does it live in water?', 'Is it large?', 'Is it a mammal?'],
        expectedQuestionType: 'specific_characteristics',
        input: {}
      },

      // Objects Category - Golden Path
      {
        name: 'objects_golden_smartphone',
        description: 'Optimal questioning path for discovering a smartphone',
        category: 'objects',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it electronic?\nA1: Yes\nQ2: Can you hold it in one hand?\nA2: Yes\nQ3: Do most people use it daily?\nA3: Yes\nQ4: Is it used for communication?\nA4: Yes',
        alreadyAskedQuestions: ['Is it electronic?', 'Can you hold it in one hand?', 'Do most people use it daily?', 'Is it used for communication?'],
        expectedQuestionType: 'specific_device',
        input: {}
      },

      // Objects Category - Furniture Path
      {
        name: 'objects_golden_chair',
        description: 'Optimal questioning path for discovering a chair',
        category: 'objects',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it furniture?\nA1: Yes\nQ2: Is it used for sitting?\nA2: Yes\nQ3: Does it have legs?\nA3: Yes\nQ4: Is it found indoors?\nA4: Sometimes',
        alreadyAskedQuestions: ['Is it furniture?', 'Is it used for sitting?', 'Does it have legs?', 'Is it found indoors?'],
        expectedQuestionType: 'material_or_style',
        input: {}
      },

      // Objects Category - Tool Path
      {
        name: 'objects_golden_hammer',
        description: 'Optimal questioning path for discovering a hammer',
        category: 'objects',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it a tool?\nA1: Yes\nQ2: Can you hold it in your hand?\nA2: Yes\nQ3: Is it used for building?\nA3: Yes\nQ4: Is it made of metal?\nA4: Sometimes',
        alreadyAskedQuestions: ['Is it a tool?', 'Can you hold it in your hand?', 'Is it used for building?', 'Is it made of metal?'],
        expectedQuestionType: 'specific_function',
        input: {}
      },

      // World Leaders Category - Golden Path
      {
        name: 'world_leaders_golden_churchill',
        description: 'Optimal questioning path for discovering Winston Churchill',
        category: 'world leaders',
        questionsAsked: 5,
        conversationHistory: 'Q1: Are they alive?\nA1: No\nQ2: Are they from Europe?\nA2: Yes\nQ3: Were they a prime minister?\nA3: Yes\nQ4: Did they serve during a major war?\nA4: Yes\nQ5: Are they British?\nA5: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they from Europe?', 'Were they a prime minister?', 'Did they serve during a major war?', 'Are they British?'],
        expectedQuestionType: 'specific_leader',
        input: {}
      },

      // World Leaders Category - Modern Leader Path
      {
        name: 'world_leaders_golden_obama',
        description: 'Optimal questioning path for discovering Barack Obama',
        category: 'world leaders',
        questionsAsked: 4,
        conversationHistory: 'Q1: Are they alive?\nA1: Yes\nQ2: Are they American?\nA2: Yes\nQ3: Were they president?\nA3: Yes\nQ4: Are they male?\nA4: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they American?', 'Were they president?', 'Are they male?'],
        expectedQuestionType: 'time_period_or_party',
        input: {}
      },

      // Cricket Players Category - Golden Path
      {
        name: 'cricket_players_golden_kohli',
        description: 'Optimal questioning path for discovering Virat Kohli',
        category: 'cricket players',
        questionsAsked: 4,
        conversationHistory: 'Q1: Are they alive?\nA1: Yes\nQ2: Are they Indian?\nA2: Yes\nQ3: Are they a batsman?\nA3: Yes\nQ4: Have they been captain?\nA4: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they Indian?', 'Are they a batsman?', 'Have they been captain?'],
        expectedQuestionType: 'specific_achievements',
        input: {}
      },

      // Football Players Category - Golden Path
      {
        name: 'football_players_golden_messi',
        description: 'Optimal questioning path for discovering Lionel Messi',
        category: 'football players',
        questionsAsked: 4,
        conversationHistory: 'Q1: Are they alive?\nA1: Yes\nQ2: Are they from South America?\nA2: Yes\nQ3: Are they a forward?\nA3: Yes\nQ4: Are they Argentine?\nA4: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they from South America?', 'Are they a forward?', 'Are they Argentine?'],
        expectedQuestionType: 'club_or_achievements',
        input: {}
      },

      // NBA Players Category - Golden Path
      {
        name: 'nba_players_golden_lebron',
        description: 'Optimal questioning path for discovering LeBron James',
        category: 'nba players',
        questionsAsked: 4,
        conversationHistory: 'Q1: Are they alive?\nA1: Yes\nQ2: Are they American?\nA2: Yes\nQ3: Are they tall?\nA3: Yes\nQ4: Are they a forward?\nA4: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they American?', 'Are they tall?', 'Are they a forward?'],
        expectedQuestionType: 'team_or_achievements',
        input: {}
      },

      // Edge Case: Early Game with Minimal Information
      {
        name: 'animals_edge_early_game',
        description: 'Early game scenario with minimal conversation history',
        category: 'animals',
        questionsAsked: 1,
        conversationHistory: 'Q1: Is it alive?\nA1: Yes',
        alreadyAskedQuestions: ['Is it alive?'],
        expectedQuestionType: 'broad_classification',
        input: {}
      },

      // Edge Case: Mid Game with Mixed Answers
      {
        name: 'objects_edge_mixed_answers',
        description: 'Mid game with mix of Yes/No/Sometimes answers',
        category: 'objects',
        questionsAsked: 6,
        conversationHistory: 'Q1: Is it electronic?\nA1: No\nQ2: Is it made of wood?\nA2: Sometimes\nQ3: Is it furniture?\nA3: No\nQ4: Can you hold it?\nA4: Yes\nQ5: Is it a tool?\nA5: Yes\nQ6: Is it used daily?\nA6: Sometimes',
        alreadyAskedQuestions: ['Is it electronic?', 'Is it made of wood?', 'Is it furniture?', 'Can you hold it?', 'Is it a tool?', 'Is it used daily?'],
        expectedQuestionType: 'specific_tool_type',
        input: {}
      },

      // Edge Case: Late Game High Pressure
      {
        name: 'world_leaders_edge_late_game',
        description: 'Late game scenario with many questions asked',
        category: 'world leaders',
        questionsAsked: 15,
        conversationHistory: 'Q1: Are they alive?\nA1: No\nQ2: Are they from Europe?\nA2: Yes\nQ3: Were they a monarch?\nA3: No\nQ4: Were they elected?\nA4: Yes\nQ5: Did they serve in 20th century?\nA5: Yes\nQ6: Were they during WWI?\nA6: No\nQ7: Were they during WWII?\nA7: Yes\nQ8: Were they Allied?\nA8: Yes\nQ9: Were they American?\nA9: No\nQ10: Were they British?\nA10: Yes\nQ11: Were they PM?\nA11: Yes\nQ12: Were they Conservative?\nA12: Yes\nQ13: Did they win Nobel Prize?\nA13: Yes\nQ14: Were they known for speeches?\nA14: Yes\nQ15: Did they smoke cigars?\nA15: Yes',
        alreadyAskedQuestions: ['Are they alive?', 'Are they from Europe?', 'Were they a monarch?', 'Were they elected?', 'Did they serve in 20th century?', 'Were they during WWI?', 'Were they during WWII?', 'Were they Allied?', 'Were they American?', 'Were they British?', 'Were they PM?', 'Were they Conservative?', 'Did they win Nobel Prize?', 'Were they known for speeches?', 'Did they smoke cigars?'],
        expectedQuestionType: 'final_identification',
        input: {}
      },

      // Edge Case: Many "Don't Know" Answers
      {
        name: 'animals_edge_many_unknown',
        description: 'Handling multiple "don\'t know" answers for animals',
        category: 'animals',
        questionsAsked: 6,
        conversationHistory: 'Q1: Is it a mammal?\nA1: Don\'t know\nQ2: Is it wild?\nA2: Don\'t know\nQ3: Is it large?\nA3: Maybe\nQ4: Does it fly?\nA4: No\nQ5: Does it live in water?\nA5: Don\'t know\nQ6: Is it dangerous?\nA6: Sometimes',
        alreadyAskedQuestions: ['Is it a mammal?', 'Is it wild?', 'Is it large?', 'Does it fly?', 'Does it live in water?', 'Is it dangerous?'],
        shouldAvoidRepetition: true,
        input: {}
      },

      // Edge Case: Contradictory Information
      {
        name: 'objects_edge_contradictory',
        description: 'Handling seemingly contradictory answers for objects',
        category: 'objects',
        questionsAsked: 4,
        conversationHistory: 'Q1: Is it electronic?\nA1: Sometimes\nQ2: Can you hold it?\nA2: Yes\nQ3: Is it battery powered?\nA3: No\nQ4: Does it need electricity?\nA4: Maybe',
        alreadyAskedQuestions: ['Is it electronic?', 'Can you hold it?', 'Is it battery powered?', 'Does it need electricity?'],
        input: {}
      },

      // Late Game Scenarios
      {
        name: 'cricket_players_late_game',
        description: 'Late game specific guessing for cricket players',
        category: 'cricket players',
        questionsAsked: 15,
        conversationHistory: 'Q1: Are they currently active?\nA1: No\nQ2: Are they from India?\nA2: Yes\nQ3: Were they a batsman?\nA3: Yes\nQ4: Did they captain India?\nA4: Yes\nQ5: Did they play before 2010?\nA5: No\n...extensive history...',
        alreadyAskedQuestions: Array.from({length: 15}, (_, i) => `Question ${i + 1}?`),
        input: {}
      }
    ]
  }

  /**
   * Creates golden test scenarios for guessing prompt builder
   */
  static createGuessingGoldenTests(): GuessingTestScenario[] {
    return [
      // Perfect fact categorization test
      {
        name: 'guessing_perfect_categorization',
        description: 'Test perfect fact categorization with clear answers',
        category: 'animals',
        questionsByNumber: {
          1: 'Is it a mammal?',
          2: 'Is it wild?',
          3: 'Is it large?',
          4: 'Does it eat meat?'
        },
        answersByNumber: {
          1: 'Yes',
          2: 'Yes', 
          3: 'Yes',
          4: 'Yes'
        },
        allAskedQuestions: ['Is it a mammal?', 'Is it wild?', 'Is it large?', 'Does it eat meat?'],
        currentQuestionNumber: 4,
        expectedFactCategorization: {
          yesFacts: [
            { n: 1, q: 'Is it a mammal?' },
            { n: 2, q: 'Is it wild?' },
            { n: 3, q: 'Is it large?' },
            { n: 4, q: 'Does it eat meat?' }
          ],
          noFacts: [],
          maybeFacts: [],
          unknownFacts: []
        },
        input: {}
      },

      // Mixed answer types test
      {
        name: 'guessing_mixed_answers',
        description: 'Test categorization with mixed answer types',
        category: 'objects',
        questionsByNumber: {
          1: 'Is it electronic?',
          2: 'Can you hold it?',
          3: 'Is it expensive?',
          4: 'Do you use it daily?',
          5: 'Is it colorful?'
        },
        answersByNumber: {
          1: 'Yes',
          2: 'Yes',
          3: 'Maybe',
          4: 'Sometimes',
          5: 'Don\'t know'
        },
        allAskedQuestions: ['Is it electronic?', 'Can you hold it?', 'Is it expensive?', 'Do you use it daily?', 'Is it colorful?'],
        currentQuestionNumber: 5,
        input: {}
      },

      // Edge case: Contradictory categorization
      {
        name: 'guessing_edge_contradictory',
        description: 'Test handling of edge case answer patterns',
        category: 'world leaders',
        questionsByNumber: {
          1: 'Are they alive?',
          2: 'Did they win awards?',
          3: 'Did they face impeachment proceedings?'
        },
        answersByNumber: {
          1: 'Kind of',
          2: 'Not really',
          3: 'It depends on who you ask'
        },
        allAskedQuestions: ['Are they alive?', 'Did they win awards?', 'Did they face impeachment proceedings?'],
        currentQuestionNumber: 3,
        input: {}
      },

      // Category constraint enforcement test
      {
        name: 'guessing_category_constraints',
        description: 'Test category constraint building for world leaders',
        category: 'world leaders',
        questionsByNumber: {
          1: 'Are they male?',
          2: 'Are they from Europe?'
        },
        answersByNumber: {
          1: 'Yes',
          2: 'Yes'
        },
        allAskedQuestions: ['Are they male?', 'Are they from Europe?'],
        currentQuestionNumber: 2,
        input: {}
      }
    ]
  }

  /**
   * Creates golden test scenarios for hint generation
   */
  static createHintGoldenTests(): HintTestScenario[] {
    return [
      // Early game hint test
      {
        name: 'hint_early_game_lion',
        description: 'Early game hint for lion with minimal established facts',
        secretItem: 'lion',
        category: 'animals',
        hintsUsed: 0,
        questionsAsked: 3,
        conversationHistory: [
          { role: 'assistant', content: 'Is it a mammal?', question_number: 1 },
          { role: 'user', content: 'Yes', question_number: 1 },
          { role: 'assistant', content: 'Is it wild?', question_number: 2 },
          { role: 'user', content: 'Yes', question_number: 2 }
        ],
        previousHints: [],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Is it a mammal?', confidence: 0.95 },
            { question: 'Is it wild?', confidence: 0.9 }
          ],
          confirmed_no: [],
          uncertain: []
        },
        expectedHintType: 'early',
        input: {}
      },

      // Mid game hint test
      {
        name: 'hint_mid_game_smartphone',
        description: 'Mid game hint for smartphone with established facts',
        secretItem: 'smartphone',
        category: 'objects',
        hintsUsed: 1,
        questionsAsked: 8,
        conversationHistory: [
          { role: 'assistant', content: 'Is it electronic?', question_number: 1 },
          { role: 'user', content: 'Yes', question_number: 1 },
          { role: 'assistant', content: 'Can you hold it?', question_number: 2 },
          { role: 'user', content: 'Yes', question_number: 2 },
          { role: 'assistant', content: 'Do most people use it daily?', question_number: 3 },
          { role: 'user', content: 'Yes', question_number: 3 }
        ],
        previousHints: ['This device is something most modern adults interact with multiple times per day.'],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Is it electronic?', confidence: 1.0 },
            { question: 'Can you hold it?', confidence: 0.95 },
            { question: 'Do most people use it daily?', confidence: 0.9 }
          ],
          confirmed_no: [],
          uncertain: []
        },
        expectedHintType: 'mid',
        input: {}
      },

      // Late game hint test with many previous hints
      {
        name: 'hint_late_game_churchill',
        description: 'Late game hint for Churchill with multiple previous hints',
        secretItem: 'winston churchill',
        category: 'world leaders',
        hintsUsed: 2,
        questionsAsked: 16,
        conversationHistory: [
          { role: 'assistant', content: 'Are they alive?', question_number: 1 },
          { role: 'user', content: 'No', question_number: 1 },
          { role: 'assistant', content: 'Are they from Europe?', question_number: 2 },
          { role: 'user', content: 'Yes', question_number: 2 }
        ],
        previousHints: [
          'This leader is remembered for inspiring speeches during difficult times.',
          'They had a very distinctive physical appearance and personal habits.'
        ],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Are they from Europe?', confidence: 1.0 },
            { question: 'Were they a prime minister?', confidence: 0.95 },
            { question: 'Did they serve during a war?', confidence: 0.9 }
          ],
          confirmed_no: [
            { question: 'Are they alive?', confidence: 1.0 }
          ],
          uncertain: []
        },
        expectedHintType: 'very_late',
        input: {}
      },

      // Edge case: No established facts
      {
        name: 'hint_edge_no_facts',
        description: 'Hint generation with no established facts yet',
        secretItem: 'elephant',
        category: 'animals',
        hintsUsed: 0,
        questionsAsked: 0,
        conversationHistory: [],
        previousHints: [],
        establishedFacts: {
          confirmed_yes: [],
          confirmed_no: [],
          uncertain: []
        },
        expectedHintType: 'early',
        input: {}
      },

      // Edge case: Contradictory facts
      {
        name: 'hint_edge_contradictory_facts',
        description: 'Hint generation with seemingly contradictory established facts',
        secretItem: 'laptop',
        category: 'objects',
        hintsUsed: 1,
        questionsAsked: 6,
        conversationHistory: [],
        previousHints: ['This item is essential for many people\'s work.'],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Is it electronic?', confidence: 1.0 },
            { question: 'Is it portable?', confidence: 0.8 }
          ],
          confirmed_no: [
            { question: 'Can you hold it in one hand?', confidence: 0.7 }
          ],
          uncertain: [
            { question: 'Is it expensive?', answer: 'It depends' },
            { question: 'Do you use it at home?', answer: 'Sometimes' }
          ]
        },
        expectedHintType: 'mid',
        input: {}
      }
    ]
  }

  /**
   * Creates performance benchmark scenarios
   */
  static createPerformanceBenchmarks(): {
    questioning: QuestioningTestScenario[],
    guessing: GuessingTestScenario[],
    hinting: HintTestScenario[]
  } {
    return {
      questioning: this.createQuestioningBenchmarks(),
      guessing: this.createGuessingBenchmarks(),
      hinting: this.createHintingBenchmarks()
    }
  }

  /**
   * Creates adversarial test scenarios to test robustness
   */
  static createAdversarialTests(): {
    questioning: QuestioningTestScenario[],
    guessing: GuessingTestScenario[],
    hinting: HintTestScenario[]
  } {
    return {
      questioning: this.createQuestioningAdversarialTests(),
      guessing: this.createGuessingAdversarialTests(),
      hinting: this.createHintingAdversarialTests()
    }
  }

  // ========== BENCHMARK SCENARIOS ==========

  private static createQuestioningBenchmarks(): QuestioningTestScenario[] {
    const categories = ['animals', 'objects', 'world leaders', 'cricket players', 'football players', 'nba players']
    const benchmarks: QuestioningTestScenario[] = []

    for (const category of categories) {
      // Early game benchmark
      benchmarks.push({
        name: `${category}_benchmark_early`,
        description: `Early game questioning benchmark for ${category}`,
        category,
        questionsAsked: 2,
        conversationHistory: 'Q1: Basic question\nA1: Yes',
        alreadyAskedQuestions: ['Basic question'],
        input: {}
      })

      // Mid game benchmark
      benchmarks.push({
        name: `${category}_benchmark_mid`,
        description: `Mid game questioning benchmark for ${category}`,
        category,
        questionsAsked: 8,
        conversationHistory: this.generateBenchmarkHistory(category, 'mid'),
        alreadyAskedQuestions: this.generateBenchmarkQuestions(category, 8),
        input: {}
      })

      // Late game benchmark
      benchmarks.push({
        name: `${category}_benchmark_late`,
        description: `Late game questioning benchmark for ${category}`,
        category,
        questionsAsked: 16,
        conversationHistory: this.generateBenchmarkHistory(category, 'late'),
        alreadyAskedQuestions: this.generateBenchmarkQuestions(category, 16),
        input: {}
      })
    }

    return benchmarks
  }

  private static createGuessingBenchmarks(): GuessingTestScenario[] {
    return [
      // Clear categorization benchmark
      {
        name: 'guessing_benchmark_clear_facts',
        description: 'Benchmark with clear fact categorization',
        category: 'animals',
        questionsByNumber: {
          1: 'Is it a mammal?',
          2: 'Is it wild?',
          3: 'Is it carnivorous?',
          4: 'Is it from Africa?',
          5: 'Is it larger than a horse?'
        },
        answersByNumber: {
          1: 'Yes',
          2: 'Yes',
          3: 'Yes',
          4: 'Yes',
          5: 'Yes'
        },
        allAskedQuestions: ['Is it a mammal?', 'Is it wild?', 'Is it carnivorous?', 'Is it from Africa?', 'Is it larger than a horse?'],
        currentQuestionNumber: 5,
        input: {}
      },

      // Complex categorization benchmark
      {
        name: 'guessing_benchmark_complex_facts',
        description: 'Benchmark with complex mixed answer categorization',
        category: 'world leaders',
        questionsByNumber: {
          1: 'Are they alive?',
          2: 'Did they face impeachment proceedings?',
          3: 'Did they serve long?',
          4: 'Are they well-known?',
          5: 'Did they change history?'
        },
        answersByNumber: {
          1: 'No',
          2: 'Sometimes',
          3: 'It depends',
          4: 'Yes',
          5: 'Don\'t know'
        },
        allAskedQuestions: ['Are they alive?', 'Did they face impeachment proceedings?', 'Did they serve long?', 'Did they win awards?', 'Did they change history?'],
        currentQuestionNumber: 5,
        input: {}
      }
    ]
  }

  private static createHintingBenchmarks(): HintTestScenario[] {
    return [
      // Optimal hint progression benchmark
      {
        name: 'hint_benchmark_optimal_progression',
        description: 'Benchmark for optimal hint progression across game stages',
        secretItem: 'tiger',
        category: 'animals',
        hintsUsed: 2,
        questionsAsked: 10,
        conversationHistory: [],
        previousHints: [
          'This animal is known for its distinctive striped pattern.',
          'It is one of the largest cats in the world.'
        ],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Is it a mammal?', confidence: 1.0 },
            { question: 'Is it wild?', confidence: 0.95 },
            { question: 'Is it a carnivore?', confidence: 0.9 },
            { question: 'Is it larger than a dog?', confidence: 0.9 }
          ],
          confirmed_no: [
            { question: 'Is it domestic?', confidence: 0.95 },
            { question: 'Is it from Africa?', confidence: 0.8 }
          ],
          uncertain: []
        },
        expectedHintType: 'late',
        input: {}
      }
    ]
  }

  // ========== ADVERSARIAL SCENARIOS ==========

  private static createQuestioningAdversarialTests(): QuestioningTestScenario[] {
    return [
      // Adversarial: All "don't know" answers
      {
        name: 'questioning_adversarial_all_unknown',
        description: 'Adversarial test with all "don\'t know" answers',
        category: 'animals',
        questionsAsked: 10,
        conversationHistory: Array.from({length: 10}, (_, i) => 
          `Q${i+1}: Question ${i+1}?\nA${i+1}: Don't know`
        ).join('\n'),
        alreadyAskedQuestions: Array.from({length: 10}, (_, i) => `Question ${i+1}?`),
        input: {}
      },

      // Adversarial: Category boundary violations
      {
        name: 'questioning_adversarial_category_violation',
        description: 'Test prevention of category boundary violations',
        category: 'world leaders',
        questionsAsked: 5,
        conversationHistory: 'Q1: Are they human?\nA1: Yes\nQ2: Are they political?\nA2: Yes',
        alreadyAskedQuestions: ['Are they human?', 'Are they political?'],
        input: {}
      },

      // Adversarial: Extreme repetition pressure
      {
        name: 'questioning_adversarial_repetition_pressure',
        description: 'Test repetition prevention under pressure',
        category: 'objects',
        questionsAsked: 18,
        conversationHistory: 'Many questions about similar concepts...',
        alreadyAskedQuestions: [
          'Is it big?', 'Is it large?', 'Is it huge?', 'Is it massive?',
          'Is it small?', 'Is it tiny?', 'Is it mini?', 'Is it compact?',
          'Is it electronic?', 'Is it digital?', 'Is it computerized?',
          'Can you hold it?', 'Is it portable?', 'Is it handheld?',
          'Is it expensive?', 'Is it costly?', 'Is it pricey?',
          'Is it useful?', 'Is it helpful?'
        ],
        input: {}
      },

      // Semantic Similarity: Grammatical variations
      {
        name: 'questioning_semantic_grammar_variations',
        description: 'Test detection of same questions with different grammar',
        category: 'world leaders',
        questionsAsked: 10,
        conversationHistory: 'Q1: Are they from Europe?\nA1: Yes\nQ2: Are they male?\nA2: Yes\nQ3: Were they a president?\nA3: No\nQ4: Did they serve in wartime?\nA4: Yes',
        alreadyAskedQuestions: [
          'Are they from Europe?',
          'Are they European?',  // Same as "from Europe"
          'Do they come from Europe?',  // Same concept
          'Were they born in Europe?',  // Similar concept
          'Are they male?',
          'Are they a man?',  // Same as "male"
          'Were they president?',
          'Did they serve as president?',  // Same as "were they president"
          'Were they a president?',  // Exact same
          'Did they hold the office of president?'  // Same concept
        ],
        shouldAvoidRepetition: true,
        input: {}
      },

      // Semantic Similarity: Active/Passive voice variations
      {
        name: 'questioning_semantic_voice_variations',
        description: 'Test detection of active vs passive voice variations',
        category: 'cricket players',
        questionsAsked: 8,
        conversationHistory: 'Q1: Are they currently playing?\nA1: No\nQ2: Were they captain?\nA2: Yes',
        alreadyAskedQuestions: [
          'Are they currently active?',
          'Are they still playing?',  // Same as "currently active"
          'Do they still play cricket?',  // Same concept
          'Have they retired?',  // Opposite of "currently active"
          'Were they retired?',  // Past tense of retirement
          'Did they retire from cricket?',  // Same as above
          'Are they playing now?',  // Same as "currently active"
          'Do they play professionally now?'  // Same concept
        ],
        shouldAvoidRepetition: true,
        input: {}
      },

      // Semantic Similarity: Synonym variations
      {
        name: 'questioning_semantic_synonym_variations',
        description: 'Test detection of synonyms and related terms',
        category: 'animals',
        questionsAsked: 12,
        conversationHistory: 'Q1: Is it wild?\nA1: Yes\nQ2: Is it large?\nA2: Yes\nQ3: Is it a carnivore?\nA3: Yes',
        alreadyAskedQuestions: [
          'Is it wild?',
          'Is it untamed?',  // Synonym of "wild"
          'Is it feral?',  // Related to "wild"
          'Is it domesticated?',  // Opposite of "wild"
          'Is it a pet?',  // Related to domestication
          'Is it large?',
          'Is it big?',  // Synonym of "large"
          'Is it huge?',  // Related to "large"
          'Is it massive?',  // Related to "large"
          'Is it small?',  // Opposite of "large"
          'Does it eat meat?',
          'Is it carnivorous?'  // Same as "eats meat"
        ],
        shouldAvoidRepetition: true,
        input: {}
      },

      // Semantic Similarity: Concept variations
      {
        name: 'questioning_semantic_concept_variations',
        description: 'Test detection of same concepts expressed differently',
        category: 'objects',
        questionsAsked: 10,
        conversationHistory: 'Q1: Is it electronic?\nA1: Yes\nQ2: Can you hold it?\nA2: Yes',
        alreadyAskedQuestions: [
          'Is it electronic?',
          'Does it use electricity?',  // Same concept
          'Does it need power?',  // Related concept
          'Is it battery-powered?',  // Subset of electronic
          'Does it have circuits?',  // Related to electronic
          'Can you hold it?',
          'Is it handheld?',  // Same as "can hold"
          'Is it portable?',  // Related to "can hold"
          'Can you carry it?',  // Similar to "can hold"
          'Does it fit in your hand?'  // Specific version of "can hold"
        ],
        shouldAvoidRepetition: true,
        input: {}
      }
    ]
  }

  private static createGuessingAdversarialTests(): GuessingTestScenario[] {
    return [
      // Adversarial: Malformed answers
      {
        name: 'guessing_adversarial_malformed_answers',
        description: 'Test handling of malformed/unclear answers',
        category: 'objects',
        questionsByNumber: {
          1: 'Is it electronic?',
          2: 'Can you hold it?',
          3: 'Is it useful?'
        },
        answersByNumber: {
          1: 'Well, sort of, but not always',
          2: 'Depends on the size I guess',
          3: 'Some people think so, others don\'t'
        },
        allAskedQuestions: ['Is it electronic?', 'Can you hold it?', 'Is it useful?'],
        currentQuestionNumber: 3,
        input: {}
      },

      // Adversarial: Empty fact sets
      {
        name: 'guessing_adversarial_no_facts',
        description: 'Test handling when no facts can be categorized',
        category: 'animals',
        questionsByNumber: {},
        answersByNumber: {},
        allAskedQuestions: [],
        currentQuestionNumber: 0,
        input: {}
      }
    ]
  }

  private static createHintingAdversarialTests(): HintTestScenario[] {
    return [
      // Adversarial: No game context
      {
        name: 'hint_adversarial_no_context',
        description: 'Test hint generation with minimal context',
        secretItem: 'mystery_item',
        category: 'objects',
        hintsUsed: 0,
        questionsAsked: 0,
        conversationHistory: [],
        previousHints: [],
        establishedFacts: {
          confirmed_yes: [],
          confirmed_no: [],
          uncertain: []
        },
        input: {}
      },

      // Adversarial: Maximum hints used
      {
        name: 'hint_adversarial_max_hints',
        description: 'Test behavior when maximum hints already used',
        secretItem: 'piano',
        category: 'objects',
        hintsUsed: 3,
        questionsAsked: 19,
        conversationHistory: [],
        previousHints: [
          'This item produces sound.',
          'It has black and white components.',
          'It requires finger dexterity to use properly.'
        ],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Does it make sound?', confidence: 1.0 },
            { question: 'Is it large?', confidence: 0.9 },
            { question: 'Is it found indoors?', confidence: 0.85 }
          ],
          confirmed_no: [
            { question: 'Is it electronic?', confidence: 0.8 },
            { question: 'Can you hold it?', confidence: 1.0 }
          ],
          uncertain: []
        },
        input: {}
      },

      // Adversarial: Contradictory established facts
      {
        name: 'hint_adversarial_contradictory_facts',
        description: 'Test hint generation with contradictory established facts',
        secretItem: 'hybrid_car',
        category: 'objects',
        hintsUsed: 1,
        questionsAsked: 8,
        conversationHistory: [],
        previousHints: ['This item represents modern innovation.'],
        establishedFacts: {
          confirmed_yes: [
            { question: 'Is it electronic?', confidence: 0.6 },
            { question: 'Does it use fuel?', confidence: 0.7 }
          ],
          confirmed_no: [
            { question: 'Is it small?', confidence: 0.9 }
          ],
          uncertain: [
            { question: 'Is it environmentally friendly?', answer: 'Sort of' },
            { question: 'Is it expensive?', answer: 'It depends' }
          ]
        },
        input: {}
      }
    ]
  }

  // ========== HELPER METHODS FOR GENERATING TEST DATA ==========

  private static generateBenchmarkHistory(category: string, stage: 'mid' | 'late'): string {
    const baseQuestions = this.getBaseCategoryQuestions(category)
    const numQuestions = stage === 'mid' ? 5 : 12
    
    let history = ''
    for (let i = 0; i < Math.min(numQuestions, baseQuestions.length); i++) {
      history += `Q${i+1}: ${baseQuestions[i]}\nA${i+1}: ${this.getTypicalAnswer(baseQuestions[i])}\n`
    }
    
    return history
  }

  private static generateBenchmarkQuestions(category: string, count: number): string[] {
    const baseQuestions = this.getBaseCategoryQuestions(category)
    return baseQuestions.slice(0, count)
  }

  private static getBaseCategoryQuestions(category: string): string[] {
    const questionSets: Record<string, string[]> = {
      'animals': [
        'Is it a mammal?', 'Is it wild?', 'Is it larger than a dog?', 'Does it eat meat?',
        'Does it live in Africa?', 'Can it swim?', 'Does it have four legs?', 'Is it dangerous?',
        'Does it live in groups?', 'Is it nocturnal?', 'Does it hibernate?', 'Can it climb trees?'
      ],
      'objects': [
        'Is it electronic?', 'Can you hold it?', 'Is it found in homes?', 'Do most people use it?',
        'Is it made of metal?', 'Is it portable?', 'Does it need power?', 'Is it expensive?',
        'Is it used daily?', 'Is it fragile?', 'Does it have buttons?', 'Is it colorful?'
      ],
      'world leaders': [
        'Are they alive?', 'Are they from Europe?', 'Were they a president?', 'Are they male?',
        'Did they serve before 1990?', 'Were they democratically elected?', 'Did they lead during war?',
        'Did they face impeachment proceedings?', 'Did they serve multiple terms?', 'Did they win awards?'
      ],
      'cricket players': [
        'Are they currently active?', 'Are they from India?', 'Are they a batsman?',
        'Have they captained their country?', 'Did they play before 2010?', 'Did they win awards?'
      ],
      'football players': [
        'Are they currently active?', 'Are they a quarterback?', 'Have they won a Super Bowl?',
        'Are they AFC?', 'Did they play before 2010?', 'Are they Hall of Fame?'
      ],
      'nba players': [
        'Are they currently active?', 'Are they a guard?', 'Have they won a championship?',
        'Are they Western Conference?', 'Did they play before 2000?', 'Are they MVP winners?'
      ]
    }

    return questionSets[category] || ['Generic question?']
  }

  private static getTypicalAnswer(question: string): string {
    // Generate typical answers for benchmark questions
    if (question.includes('mammal') || question.includes('wild') || question.includes('large')) return 'Yes'
    if (question.includes('electronic') || question.includes('hold') || question.includes('daily')) return 'Yes'
    if (question.includes('alive') && question.includes('leader')) return 'No'
    if (question.includes('active') && question.includes('player')) return 'No'
    return Math.random() > 0.5 ? 'Yes' : 'No'
  }

}

/**
 * Test data generator for creating large-scale evaluation datasets
 */
export class TestDataGenerator {
  /**
   * Generates random test scenarios for stress testing
   */
  static generateRandomScenarios(count: number, category: string): QuestioningTestScenario[] {
    const scenarios: QuestioningTestScenario[] = []
    
    for (let i = 0; i < count; i++) {
      scenarios.push({
        name: `random_${category}_${i}`,
        description: `Random test scenario ${i} for ${category}`,
        category,
        questionsAsked: Math.floor(Math.random() * 20),
        conversationHistory: this.generateRandomHistory(),
        alreadyAskedQuestions: this.generateRandomQuestions(Math.floor(Math.random() * 10)),
        input: {}
      })
    }
    
    return scenarios
  }

  /**
   * Creates comprehensive category coverage tests
   */
  static createCategoryCoverageTests(): QuestioningTestScenario[] {
    const categories = ['animals', 'objects', 'world leaders', 'cricket players', 'football players', 'nba players']
    const scenarios: QuestioningTestScenario[] = []
    
    for (const category of categories) {
      // Test each stage of the game
      for (const stage of ['early', 'mid', 'late']) {
        scenarios.push({
          name: `coverage_${category}_${stage}`,
          description: `Category coverage test for ${category} in ${stage} game`,
          category,
          questionsAsked: stage === 'early' ? 3 : stage === 'mid' ? 10 : 17,
          conversationHistory: this.generateStageAppropriateHistory(category, stage),
          alreadyAskedQuestions: this.generateStageAppropriateQuestions(category, stage),
          input: {}
        })
      }
    }
    
    return scenarios
  }

  private static generateRandomHistory(): string {
    const questionTypes = [
      'Is it a {type}?', 'Does it {action}?', 'Can it {ability}?', 
      'Is it {adjective}?', 'Does it have {property}?'
    ]
    
    let history = ''
    const numQuestions = Math.floor(Math.random() * 8) + 2
    
    for (let i = 0; i < numQuestions; i++) {
      const template = questionTypes[Math.floor(Math.random() * questionTypes.length)]
      const question = template.replace(/\{[^}]+\}/g, 'something')
      const answer = Math.random() > 0.5 ? 'Yes' : 'No'
      history += `Q${i+1}: ${question}\nA${i+1}: ${answer}\n`
    }
    
    return history
  }

  private static generateRandomQuestions(count: number): string[] {
    const questions: string[] = []
    for (let i = 0; i < count; i++) {
      questions.push(`Random question ${i + 1}?`)
    }
    return questions
  }

  private static generateStageAppropriateHistory(category: string, stage: string): string {
    // Generate realistic conversation history for different game stages
    const baseQuestions = GoldenTestSets['getBaseCategoryQuestions']?.(category) || ['Generic question?']
    const questionCount = stage === 'early' ? 3 : stage === 'mid' ? 8 : 15
    
    let history = ''
    for (let i = 0; i < Math.min(questionCount, baseQuestions.length); i++) {
      const answer = this.generateRealisticAnswer(baseQuestions[i], stage)
      history += `Q${i+1}: ${baseQuestions[i]}\nA${i+1}: ${answer}\n`
    }
    
    return history
  }

  private static generateStageAppropriateQuestions(category: string, stage: string): string[] {
    const baseQuestions = GoldenTestSets['getBaseCategoryQuestions']?.(category) || ['Generic question?']
    const questionCount = stage === 'early' ? 3 : stage === 'mid' ? 8 : 15
    
    return baseQuestions.slice(0, questionCount)
  }

  private static generateRealisticAnswer(question: string, stage: string): string {
    // Generate realistic answers based on question type and game stage
    const answerTypes = ['Yes', 'No', 'Maybe', 'Don\'t know', 'Sometimes', 'It depends']
    
    // Early game: more definitive answers
    if (stage === 'early') {
      return Math.random() > 0.2 ? (Math.random() > 0.5 ? 'Yes' : 'No') : 'Maybe'
    }
    
    // Mid game: mixed answers
    if (stage === 'mid') {
      return answerTypes[Math.floor(Math.random() * answerTypes.length)]
    }
    
    // Late game: more uncertain as questions get specific
    return Math.random() > 0.4 ? (Math.random() > 0.5 ? 'Yes' : 'No') : 'Don\'t know'
  }
}

/**
 * Factual accuracy test scenarios for testing AI's truthfulness when answering yes/no questions
 */
export class FactualAccuracyTests {
  /**
   * Creates comprehensive factual accuracy test scenarios
   */
  static createFactualAccuracyTests(): FactualTestScenario[] {
    return [
      // Animals - Tiger
      {
        name: 'factual_accuracy_tiger',
        description: 'Tests factual accuracy for tiger-related questions',
        secretItem: 'tiger',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a mammal?',
            expectedAnswer: 'Yes',
            reasoning: 'Tigers are mammals - they have fur, are warm-blooded, and nurse their young'
          },
          {
            question: 'Is it a carnivore?',
            expectedAnswer: 'Yes', 
            reasoning: 'Tigers are obligate carnivores that primarily eat meat'
          },
          {
            question: 'Does it have stripes?',
            expectedAnswer: 'Yes',
            reasoning: 'Tigers are famous for their distinctive orange and black stripe pattern'
          },
          {
            question: 'Is it extinct?',
            expectedAnswer: 'No',
            reasoning: 'Tigers are endangered but not extinct - several subspecies still exist'
          },
          {
            question: 'Does it live in Africa?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Wild tigers live in Asia, but some tigers live in African zoos'
          },
          {
            question: 'Can it fly?',
            expectedAnswer: 'No',
            reasoning: 'Tigers are terrestrial mammals and cannot fly'
          },
          {
            question: 'Is it a domestic animal?',
            expectedAnswer: 'No',
            reasoning: 'Tigers are wild animals, not domesticated pets'
          }
        ],
        ambiguousQuestions: [
          'Is it dangerous?', // Depends on context
          'Is it beautiful?', // Subjective
          'Is it rare?' // Depends on definition of rare
        ]
      },

      // World Leaders - Einstein
      {
        name: 'factual_accuracy_einstein',
        description: 'Tests factual accuracy for Einstein-related questions',
        secretItem: 'Einstein',
        category: 'world leaders',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a scientist?',
            expectedAnswer: 'Yes',
            reasoning: 'Albert Einstein was a theoretical physicist and scientist'
          },
          {
            question: 'Did they win a Nobel Prize?',
            expectedAnswer: 'Yes',
            reasoning: 'Einstein won the Nobel Prize in Physics in 1921'
          },
          {
            question: 'Are they alive?',
            expectedAnswer: 'No',
            reasoning: 'Einstein died in 1955'
          },
          {
            question: 'Are they German?',
            expectedAnswer: 'Yes',
            reasoning: 'Einstein was born in Germany (though he later became a US citizen)'
          },
          {
            question: 'Are they a sports player?',
            expectedAnswer: 'No',
            reasoning: 'Einstein was a scientist, not an athlete'
          },
          {
            question: 'Are they male?',
            expectedAnswer: 'Yes',
            reasoning: 'Albert Einstein was male'
          },
          {
            question: 'Did they develop the theory of relativity?',
            expectedAnswer: 'Yes',
            reasoning: 'Einstein is famous for developing both special and general relativity'
          }
        ],
        ambiguousQuestions: [
          'Did they face impeachment proceedings?', // Factual historical record
          'Are they the smartest person ever?', // Subjective
          'Are they well-known?' // Subjective measure
        ]
      },

      // Objects - Chair
      {
        name: 'factual_accuracy_chair',
        description: 'Tests factual accuracy for chair-related questions',
        secretItem: 'chair',
        category: 'objects',
        input: {},
        factualQuestions: [
          {
            question: 'Is it furniture?',
            expectedAnswer: 'Yes',
            reasoning: 'Chairs are a type of furniture used for sitting'
          },
          {
            question: 'Is it used for sitting?',
            expectedAnswer: 'Yes',
            reasoning: 'The primary purpose of a chair is to provide a place to sit'
          },
          {
            question: 'Is it alive?',
            expectedAnswer: 'No',
            reasoning: 'Chairs are inanimate objects, not living organisms'
          },
          {
            question: 'Does it typically have legs?',
            expectedAnswer: 'Yes',
            reasoning: 'Most chairs have legs for support (though some have pedestals)'
          },
          {
            question: 'Is it made of wood?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Some chairs are wooden, others are metal, plastic, or other materials'
          },
          {
            question: 'Can you carry it?',
            expectedAnswer: 'Yes',
            reasoning: 'Most chairs are portable and can be carried by one person'
          },
          {
            question: 'Is it found indoors?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Chairs are found both indoors and outdoors'
          }
        ],
        ambiguousQuestions: [
          'Is it comfortable?', // Depends on the specific chair
          'Is it expensive?', // Varies widely
          'Is it stylish?' // Subjective
        ]
      },

      // Objects - Apple
      {
        name: 'factual_accuracy_apple',
        description: 'Tests factual accuracy for apple-related questions',
        secretItem: 'apple',
        category: 'objects',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a fruit?',
            expectedAnswer: 'Yes',
            reasoning: 'Apples are a type of fruit that grows on apple trees'
          },
          {
            question: 'Is it edible?',
            expectedAnswer: 'Yes',
            reasoning: 'Apples are commonly eaten as food'
          },
          {
            question: 'Does it grow on trees?',
            expectedAnswer: 'Yes',
            reasoning: 'Apples grow on apple trees'
          },
          {
            question: 'Is it red?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Some apples are red, others are green, yellow, or other colors'
          },
          {
            question: 'Does it have seeds?',
            expectedAnswer: 'Yes',
            reasoning: 'Apples contain seeds in their core'
          },
          {
            question: 'Is it round?',
            expectedAnswer: 'Yes',
            reasoning: 'Apples are generally round or spherical in shape'
          },
          {
            question: 'Is it alive?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Apples are alive when growing on the tree, but not after being picked'
          }
        ],
        ambiguousQuestions: [
          'Is it sweet?', // Depends on variety and ripeness
          'Is it large?', // Relative to what?
          'Is it juicy?' // Varies by variety and freshness
        ]
      },

      // Cricket Players - Virat Kohli
      {
        name: 'factual_accuracy_virat_kohli',
        description: 'Tests factual accuracy for cricket player questions',
        secretItem: 'Virat Kohli',
        category: 'cricket players',
        input: {},
        factualQuestions: [
          {
            question: 'Is he a cricket player?',
            expectedAnswer: 'Yes',
            reasoning: 'Virat Kohli is a professional cricket player'
          },
          {
            question: 'Is he Indian?',
            expectedAnswer: 'Yes',
            reasoning: 'Virat Kohli is from India'
          },
          {
            question: 'Is he a batsman?',
            expectedAnswer: 'Yes',
            reasoning: 'Kohli is primarily known as a batsman'
          },
          {
            question: 'Has he been captain of India?',
            expectedAnswer: 'Yes',
            reasoning: 'Kohli was captain of the Indian cricket team'
          },
          {
            question: 'Is he alive?',
            expectedAnswer: 'Yes',
            reasoning: 'Virat Kohli is currently alive and active'
          },
          {
            question: 'Is he a footballer?',
            expectedAnswer: 'No',
            reasoning: 'Kohli plays cricket, not football'
          },
          {
            question: 'Is he male?',
            expectedAnswer: 'Yes',
            reasoning: 'Virat Kohli is male'
          }
        ],
        ambiguousQuestions: [
          'Is he the best player?', // Subjective opinion
          'Is he fast?', // Context dependent
          'Did he win awards?' // Measurable achievement
        ]
      },

      // Animals - Dog
      {
        name: 'factual_accuracy_dog',
        description: 'Tests factual accuracy for domestic animal questions',
        secretItem: 'dog',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a mammal?',
            expectedAnswer: 'Yes',
            reasoning: 'Dogs are mammals with fur and nurse their young'
          },
          {
            question: 'Is it domesticated?',
            expectedAnswer: 'Yes',
            reasoning: 'Dogs are domesticated animals kept as pets'
          },
          {
            question: 'Does it bark?',
            expectedAnswer: 'Yes',
            reasoning: 'Dogs are known for barking as communication'
          },
          {
            question: 'Is it a carnivore?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Dogs are omnivores but descended from carnivores'
          },
          {
            question: 'Can it fly?',
            expectedAnswer: 'No',
            reasoning: 'Dogs are terrestrial mammals and cannot fly'
          },
          {
            question: 'Does it have four legs?',
            expectedAnswer: 'Yes',
            reasoning: 'Dogs are quadrupeds with four legs'
          }
        ],
        ambiguousQuestions: [
          'Is it large?', // Depends on breed
          'Is it friendly?', // Depends on individual dog
          'Is it expensive?' // Varies by breed and source
        ]
      },

      // Objects - Smartphone
      {
        name: 'factual_accuracy_smartphone',
        description: 'Tests factual accuracy for electronic device questions',
        secretItem: 'smartphone',
        category: 'objects',
        input: {},
        factualQuestions: [
          {
            question: 'Is it electronic?',
            expectedAnswer: 'Yes',
            reasoning: 'Smartphones are electronic devices with circuits and processors'
          },
          {
            question: 'Can you hold it in your hand?',
            expectedAnswer: 'Yes',
            reasoning: 'Smartphones are designed to be handheld devices'
          },
          {
            question: 'Does it need electricity?',
            expectedAnswer: 'Yes',
            reasoning: 'Smartphones require battery power to function'
          },
          {
            question: 'Is it alive?',
            expectedAnswer: 'No',
            reasoning: 'Smartphones are inanimate electronic objects'
          },
          {
            question: 'Can it make calls?',
            expectedAnswer: 'Yes',
            reasoning: 'Making phone calls is a primary function of smartphones'
          },
          {
            question: 'Is it furniture?',
            expectedAnswer: 'No',
            reasoning: 'Smartphones are portable electronics, not furniture'
          }
        ],
        ambiguousQuestions: [
          'Is it expensive?', // Varies by model and brand
          'Is it large?', // Relative to other phones
          'Was it sold commercially?' // Factual market presence
        ]
      },

      // World Leaders - Barack Obama
      {
        name: 'factual_accuracy_obama',
        description: 'Tests factual accuracy for former president questions',
        secretItem: 'Barack Obama',
        category: 'world leaders',
        input: {},
        factualQuestions: [
          {
            question: 'Is he a person?',
            expectedAnswer: 'Yes',
            reasoning: 'Barack Obama is a human being'
          },
          {
            question: 'Was he president of the USA?',
            expectedAnswer: 'Yes',
            reasoning: 'Obama was the 44th President of the United States'
          },
          {
            question: 'Is he American?',
            expectedAnswer: 'Yes',
            reasoning: 'Obama is an American citizen and former president'
          },
          {
            question: 'Is he alive?',
            expectedAnswer: 'Yes',
            reasoning: 'Barack Obama is currently alive'
          },
          {
            question: 'Is he a sports player?',
            expectedAnswer: 'No',
            reasoning: 'Obama is a politician, not a professional athlete'
          },
          {
            question: 'Is he male?',
            expectedAnswer: 'Yes',
            reasoning: 'Barack Obama is male'
          }
        ],
        ambiguousQuestions: [
          'Did he win awards?', // Measurable achievement
          'Is he tall?', // Relative measure
          'Is he the best president?' // Subjective opinion
        ]
      },

      // Football Players - Lionel Messi
      {
        name: 'factual_accuracy_messi',
        description: 'Tests factual accuracy for football player questions',
        secretItem: 'Lionel Messi',
        category: 'football players',
        input: {},
        factualQuestions: [
          {
            question: 'Is he a football player?',
            expectedAnswer: 'Yes',
            reasoning: 'Messi is a professional football (soccer) player'
          },
          {
            question: 'Is he Argentine?',
            expectedAnswer: 'Yes',
            reasoning: 'Lionel Messi is from Argentina'
          },
          {
            question: 'Is he a forward?',
            expectedAnswer: 'Yes',
            reasoning: 'Messi primarily plays as a forward'
          },
          {
            question: 'Is he alive?',
            expectedAnswer: 'Yes',
            reasoning: 'Lionel Messi is currently alive and active'
          },
          {
            question: 'Is he a basketball player?',
            expectedAnswer: 'No',
            reasoning: 'Messi plays football/soccer, not basketball'
          },
          {
            question: 'Is he male?',
            expectedAnswer: 'Yes',
            reasoning: 'Lionel Messi is male'
          }
        ],
        ambiguousQuestions: [
          'Is he the best player?', // Subjective debate
          'Is he fast?', // Depends on context
          'Is he short?' // Relative to other players
        ]
      },

      // NBA Players - LeBron James
      {
        name: 'factual_accuracy_lebron',
        description: 'Tests factual accuracy for NBA player questions',
        secretItem: 'LeBron James',
        category: 'nba players',
        input: {},
        factualQuestions: [
          {
            question: 'Is he a basketball player?',
            expectedAnswer: 'Yes',
            reasoning: 'LeBron James is a professional NBA basketball player'
          },
          {
            question: 'Is he American?',
            expectedAnswer: 'Yes',
            reasoning: 'LeBron James is from the United States'
          },
          {
            question: 'Is he tall?',
            expectedAnswer: 'Yes',
            reasoning: 'LeBron is 6\'9" which is considered tall'
          },
          {
            question: 'Is he alive?',
            expectedAnswer: 'Yes',
            reasoning: 'LeBron James is currently alive and active'
          },
          {
            question: 'Is he a tennis player?',
            expectedAnswer: 'No',
            reasoning: 'LeBron plays basketball, not tennis'
          },
          {
            question: 'Is he male?',
            expectedAnswer: 'Yes',
            reasoning: 'LeBron James is male'
          }
        ],
        ambiguousQuestions: [
          'Is he the best player?', // Subjective debate
          'Is he old?', // Relative to other players
          'Is he strong?' // Subjective measure
        ]
      },

      // Animals - Eagle
      {
        name: 'factual_accuracy_eagle',
        description: 'Tests factual accuracy for bird questions',
        secretItem: 'eagle',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a bird?',
            expectedAnswer: 'Yes',
            reasoning: 'Eagles are large birds of prey'
          },
          {
            question: 'Can it fly?',
            expectedAnswer: 'Yes',
            reasoning: 'Eagles are powerful flying birds'
          },
          {
            question: 'Is it a predator?',
            expectedAnswer: 'Yes',
            reasoning: 'Eagles are apex predators that hunt other animals'
          },
          {
            question: 'Does it have feathers?',
            expectedAnswer: 'Yes',
            reasoning: 'Eagles are birds and have feathers'
          },
          {
            question: 'Is it a mammal?',
            expectedAnswer: 'No',
            reasoning: 'Eagles are birds, not mammals'
          },
          {
            question: 'Does it live underwater?',
            expectedAnswer: 'No',
            reasoning: 'Eagles are aerial birds, not aquatic animals'
          }
        ],
        ambiguousQuestions: [
          'Is it dangerous?', // Depends on context
          'Is it large?', // Relative to other birds
          'Is it beautiful?' // Subjective opinion
        ]
      },

      // Objects - Piano
      {
        name: 'factual_accuracy_piano',
        description: 'Tests factual accuracy for musical instrument questions',
        secretItem: 'piano',
        category: 'objects',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a musical instrument?',
            expectedAnswer: 'Yes',
            reasoning: 'Pianos are musical instruments played with keys'
          },
          {
            question: 'Does it have keys?',
            expectedAnswer: 'Yes',
            reasoning: 'Pianos have black and white keys for playing notes'
          },
          {
            question: 'Is it heavy?',
            expectedAnswer: 'Yes',
            reasoning: 'Pianos are typically very heavy instruments'
          },
          {
            question: 'Is it alive?',
            expectedAnswer: 'No',
            reasoning: 'Pianos are inanimate objects'
          },
          {
            question: 'Can you carry it in your pocket?',
            expectedAnswer: 'No',
            reasoning: 'Pianos are large, heavy instruments'
          },
          {
            question: 'Does it make sound?',
            expectedAnswer: 'Yes',
            reasoning: 'Pianos produce musical sounds when played'
          }
        ],
        ambiguousQuestions: [
          'Is it expensive?', // Varies greatly by type
          'Is it beautiful?', // Subjective aesthetic judgment
          'Is it old?' // Depends on specific piano
        ]
      }
    ]
  }

  /**
   * Creates edge case scenarios for factual accuracy testing
   */
  static createFactualEdgeCaseTests(): FactualTestScenario[] {
    return [
      // Contradiction detection test
      {
        name: 'factual_contradiction_detection',
        description: 'Tests ability to detect and handle factual contradictions',
        secretItem: 'penguin',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Can it fly?',
            expectedAnswer: 'No',
            reasoning: 'Penguins cannot fly - they are flightless birds'
          },
          {
            question: 'Is it a bird?',
            expectedAnswer: 'Yes',
            reasoning: 'Penguins are birds, even though they cannot fly'
          },
          {
            question: 'Does it live in cold places?',
            expectedAnswer: 'Yes',
            reasoning: 'Most penguin species live in cold Antarctic environments'
          },
          {
            question: 'Can it swim?',
            expectedAnswer: 'Yes',
            reasoning: 'Penguins are excellent swimmers'
          }
        ],
        ambiguousQuestions: [
          'Is it cute?', // Subjective
          'Is it small?' // Depends on penguin species
        ]
      },

      // Temporal accuracy test
      {
        name: 'factual_temporal_accuracy',
        description: 'Tests accuracy for time-sensitive facts',
        secretItem: 'Nelson Mandela',
        category: 'world leaders',
        input: {},
        factualQuestions: [
          {
            question: 'Are they alive?',
            expectedAnswer: 'No',
            reasoning: 'Nelson Mandela died in 2013'
          },
          {
            question: 'Were they president of South Africa?',
            expectedAnswer: 'Yes',
            reasoning: 'Mandela was president of South Africa from 1994-1999'
          },
          {
            question: 'Were they imprisoned?',
            expectedAnswer: 'Yes',
            reasoning: 'Mandela was imprisoned for 27 years'
          },
          {
            question: 'Did they fight apartheid?',
            expectedAnswer: 'Yes',
            reasoning: 'Mandela was a key factor in fighting apartheid'
          }
        ]
      },

      // Extinct species test
      {
        name: 'factual_extinct_species',
        description: 'Tests accuracy for extinct animals',
        secretItem: 'dinosaur',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it extinct?',
            expectedAnswer: 'Yes',
            reasoning: 'Dinosaurs went extinct millions of years ago'
          },
          {
            question: 'Is it alive?',
            expectedAnswer: 'No',
            reasoning: 'No dinosaurs are currently alive'
          },
          {
            question: 'Is it a reptile?',
            expectedAnswer: 'Yes',
            reasoning: 'Dinosaurs were reptiles'
          },
          {
            question: 'Did it exist millions of years ago?',
            expectedAnswer: 'Yes',
            reasoning: 'Dinosaurs lived millions of years ago'
          }
        ],
        ambiguousQuestions: [
          'Is it large?', // Some were large, some small
          'Is it dangerous?', // Depends on species
          'Is it scary?' // Subjective opinion
        ]
      },

      // Mythical entity test
      {
        name: 'factual_mythical_entity',
        description: 'Tests handling of fictional/mythical entities',
        secretItem: 'unicorn',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it real?',
            expectedAnswer: 'No',
            reasoning: 'Unicorns are mythical creatures, not real animals'
          },
          {
            question: 'Is it fictional?',
            expectedAnswer: 'Yes',
            reasoning: 'Unicorns exist only in mythology and fiction'
          },
          {
            question: 'Does it have a horn?',
            expectedAnswer: 'Yes',
            reasoning: 'In mythology, unicorns are depicted with a single horn'
          },
          {
            question: 'Is it a horse?',
            expectedAnswer: 'Sometimes',
            reasoning: 'Unicorns are typically depicted as horse-like creatures'
          }
        ],
        ambiguousQuestions: [
          'Is it magical?', // In mythology, yes
          'Is it beautiful?', // Subjective
          'Is it rare?' // Depends on context of reality vs mythology
        ]
      },

      // Modern technology test
      {
        name: 'factual_modern_technology',
        description: 'Tests accuracy for recent technology',
        secretItem: 'virtual reality headset',
        category: 'objects',
        input: {},
        factualQuestions: [
          {
            question: 'Is it electronic?',
            expectedAnswer: 'Yes',
            reasoning: 'VR headsets are electronic devices'
          },
          {
            question: 'Is it wearable?',
            expectedAnswer: 'Yes',
            reasoning: 'VR headsets are worn on the head'
          },
          {
            question: 'Does it display images?',
            expectedAnswer: 'Yes',
            reasoning: 'VR headsets display visual content to users'
          },
          {
            question: 'Is it old technology?',
            expectedAnswer: 'No',
            reasoning: 'VR headsets are relatively recent technology'
          }
        ],
        ambiguousQuestions: [
          'Is it expensive?', // Varies by model
          'Is it sold commercially?', // Factual market presence
          'Is it heavy?' // Depends on specific model
        ]
      },

      // Complex classification test
      {
        name: 'factual_complex_classification',
        description: 'Tests complex biological classification',
        secretItem: 'whale',
        category: 'animals',
        input: {},
        factualQuestions: [
          {
            question: 'Is it a mammal?',
            expectedAnswer: 'Yes',
            reasoning: 'Whales are marine mammals'
          },
          {
            question: 'Does it live in water?',
            expectedAnswer: 'Yes',
            reasoning: 'Whales are aquatic animals'
          },
          {
            question: 'Is it a fish?',
            expectedAnswer: 'No',
            reasoning: 'Whales are mammals, not fish'
          },
          {
            question: 'Does it breathe air?',
            expectedAnswer: 'Yes',
            reasoning: 'Whales breathe air through lungs, not gills'
          },
          {
            question: 'Does it have gills?',
            expectedAnswer: 'No',
            reasoning: 'Whales have lungs, not gills'
          }
        ],
        ambiguousQuestions: [
          'Is it large?', // Most are, but some species are smaller
          'Is it dangerous?', // Depends on species and context
          'Is it intelligent?' // High intelligence but subjective measure
        ]
      },

      // Historical figure test
      {
        name: 'factual_historical_figure',
        description: 'Tests accuracy for historical figures',
        secretItem: 'Leonardo da Vinci',
        category: 'world leaders',
        input: {},
        factualQuestions: [
          {
            question: 'Was he an artist?',
            expectedAnswer: 'Yes',
            reasoning: 'Leonardo da Vinci was a famous Renaissance artist'
          },
          {
            question: 'Was he an inventor?',
            expectedAnswer: 'Yes',
            reasoning: 'Leonardo was also an inventor and engineer'
          },
          {
            question: 'Is he alive?',
            expectedAnswer: 'No',
            reasoning: 'Leonardo da Vinci died in 1519'
          },
          {
            question: 'Was he Italian?',
            expectedAnswer: 'Yes',
            reasoning: 'Leonardo was born in Italy during the Renaissance'
          },
          {
            question: 'Was he a political leader?',
            expectedAnswer: 'No',
            reasoning: 'Leonardo was an artist/inventor, not a political leader'
          }
        ],
        ambiguousQuestions: [
          'Was he the greatest artist?', // Subjective opinion
          'Was he ahead of his time?', // Generally agreed but subjective
          'Was he wealthy?' // Varied throughout his life
        ]
      }
    ]
  }
}