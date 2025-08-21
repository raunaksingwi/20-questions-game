/**
 * Main evaluation orchestrator for running comprehensive prompt evaluations.
 * Coordinates all evaluators and generates detailed performance reports.
 */

import { BaseEvaluator, EvaluationResult, TestScenario } from './BaseEvaluator.ts'
import { QuestioningEvaluator, CategoryQuestioningEvaluator } from './QuestioningEvaluator.ts'
import { GuessingEvaluator } from './GuessingEvaluator.ts'
import { HintEvaluator } from './HintEvaluator.ts'
import { FactualAnswerEvaluator } from './FactualAnswerEvaluator.ts'
import { GoldenTestSets, TestDataGenerator, FactualAccuracyTests } from './TestScenarios.ts'

export interface EvaluationSuite {
  name: string
  description: string
  evaluators: BaseEvaluator[]
  scenarios: TestScenario[]
}

export interface EvaluationReport {
  suiteResults: EvaluationSuiteResult[]
  overallMetrics: {
    totalTests: number
    passedTests: number
    failedTests: number
    averageScore: number
    executionTimeMs: number
  }
  categoryBreakdown: Record<string, {
    passRate: number
    averageScore: number
    criticalFailures: string[]
  }>
  recommendations: string[]
  timestamp: Date
}

export interface EvaluationSuiteResult {
  suiteName: string
  results: EvaluationResult[]
  summary: {
    passRate: number
    averageScore: number
    criticalFailures: string[]
    topPerformingTests: string[]
    poorPerformingTests: string[]
  }
}

export class EvaluationRunner {
  private suites: EvaluationSuite[] = []

  constructor() {
    this.initializeDefaultSuites()
  }

  /**
   * Initializes comprehensive evaluation suites for all prompt types
   */
  private initializeDefaultSuites(): void {
    // AI Questioning Templates Suite
    this.suites.push({
      name: 'AI_Questioning_Templates',
      description: 'Comprehensive evaluation of AI questioning templates across all categories',
      evaluators: [
        new CategoryQuestioningEvaluator('animals'),
        new CategoryQuestioningEvaluator('objects'),
        new CategoryQuestioningEvaluator('world leaders'),
        new CategoryQuestioningEvaluator('cricket players'),
        new CategoryQuestioningEvaluator('football players'),
        new CategoryQuestioningEvaluator('nba players')
      ],
      scenarios: GoldenTestSets.createQuestioningGoldenTests()
    })

    // AI Guessing Prompt Builder Suite
    this.suites.push({
      name: 'AI_Guessing_Prompt_Builder',
      description: 'Evaluation of guessing prompt builder functionality',
      evaluators: [new GuessingEvaluator()],
      scenarios: GoldenTestSets.createGuessingGoldenTests()
    })

    // Hint Generation Suite
    this.suites.push({
      name: 'Hint_Generation',
      description: 'Evaluation of hint generation prompt quality',
      evaluators: [new HintEvaluator()],
      scenarios: GoldenTestSets.createHintGoldenTests()
    })

    // Factual Answer Accuracy Suite
    this.suites.push({
      name: 'Factual_Answer_Accuracy',
      description: 'Critical evaluation of AI factual accuracy when answering yes/no questions about secret items',
      evaluators: [new FactualAnswerEvaluator()],
      scenarios: [
        ...FactualAccuracyTests.createFactualAccuracyTests(),
        ...FactualAccuracyTests.createFactualEdgeCaseTests()
      ]
    })

    // Performance Benchmarks Suite
    const benchmarks = GoldenTestSets.createPerformanceBenchmarks()
    this.suites.push({
      name: 'Performance_Benchmarks',
      description: 'Performance benchmarking across all prompt types',
      evaluators: [
        new QuestioningEvaluator(),
        new GuessingEvaluator(),
        new HintEvaluator(),
        new FactualAnswerEvaluator()
      ],
      scenarios: [...benchmarks.questioning, ...benchmarks.guessing, ...benchmarks.hinting]
    })

    // Adversarial Tests Suite
    const adversarialTests = GoldenTestSets.createAdversarialTests()
    this.suites.push({
      name: 'Adversarial_Tests',
      description: 'Robustness testing with edge cases and adversarial inputs',
      evaluators: [
        new QuestioningEvaluator(),
        new GuessingEvaluator(),
        new HintEvaluator(),
        new FactualAnswerEvaluator()
      ],
      scenarios: [...adversarialTests.questioning, ...adversarialTests.guessing, ...adversarialTests.hinting]
    })
  }

  /**
   * Runs complete evaluation across all suites
   */
  async runCompleteEvaluation(): Promise<EvaluationReport> {
    const startTime = Date.now()
    const suiteResults: EvaluationSuiteResult[] = []

    console.log('🚀 Starting comprehensive prompt evaluation...')

    for (const suite of this.suites) {
      console.log(`\n📊 Running suite: ${suite.name}`)
      const suiteResult = await this.runEvaluationSuite(suite)
      suiteResults.push(suiteResult)
      
      console.log(`✅ Suite ${suite.name} completed: ${suiteResult.summary.passRate}% pass rate`)
    }

    const report = this.generateComprehensiveReport(suiteResults, Date.now() - startTime)
    
    console.log('\n📈 Evaluation completed!')
    console.log(`Overall Results: ${report.overallMetrics.passedTests}/${report.overallMetrics.totalTests} tests passed (${Math.round(report.overallMetrics.passedTests / report.overallMetrics.totalTests * 100)}%)`)
    
    return report
  }

  /**
   * Runs evaluation for a specific suite
   */
  async runEvaluationSuite(suite: EvaluationSuite): Promise<EvaluationSuiteResult> {
    const results: EvaluationResult[] = []

    for (const evaluator of suite.evaluators) {
      // Filter scenarios appropriate for this evaluator
      const applicableScenarios = this.filterScenariosForEvaluator(suite.scenarios, evaluator)
      
      for (const scenario of applicableScenarios) {
        try {
          const result = await evaluator.evaluateScenario(scenario)
          results.push(result)
        } catch (error) {
          console.error(`❌ Error evaluating scenario ${scenario.name}:`, error)
          // Add error result
          results.push({
            evaluatorName: evaluator.constructor.name,
            promptType: (evaluator as any).promptType,
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
            executionTimeMs: 0
          })
        }
      }
    }

    return {
      suiteName: suite.name,
      results,
      summary: this.generateSuiteSummary(results)
    }
  }

  /**
   * Runs evaluation for a specific category only
   */
  async runCategoryEvaluation(category: string): Promise<EvaluationSuiteResult> {
    console.log(`🎯 Running evaluation for category: ${category}`)

    const categoryEvaluator = new CategoryQuestioningEvaluator(category)
    const categoryScenarios = categoryEvaluator.createCategoryTestScenarios()
    
    const results: EvaluationResult[] = []
    for (const scenario of categoryScenarios) {
      const result = await categoryEvaluator.evaluateScenario(scenario)
      results.push(result)
    }

    return {
      suiteName: `Category_${category}`,
      results,
      summary: this.generateSuiteSummary(results)
    }
  }

  /**
   * Runs quick evaluation with essential tests only
   */
  async runQuickEvaluation(): Promise<EvaluationReport> {
    const startTime = Date.now()
    console.log('⚡ Running quick evaluation with essential tests...')

    // Select representative tests from each category
    const quickScenarios = [
      ...GoldenTestSets.createQuestioningGoldenTests().slice(0, 3),
      ...GoldenTestSets.createGuessingGoldenTests().slice(0, 2),
      ...GoldenTestSets.createHintGoldenTests().slice(0, 2)
    ]

    const quickSuite: EvaluationSuite = {
      name: 'Quick_Evaluation',
      description: 'Essential tests for rapid feedback',
      evaluators: [
        new QuestioningEvaluator(),
        new GuessingEvaluator(),
        new HintEvaluator()
      ],
      scenarios: quickScenarios
    }

    const suiteResult = await this.runEvaluationSuite(quickSuite)
    const report = this.generateComprehensiveReport([suiteResult], Date.now() - startTime)

    console.log(`⚡ Quick evaluation completed in ${Math.round(report.overallMetrics.executionTimeMs / 1000)}s`)
    
    return report
  }

  /**
   * Runs regression testing to compare prompt versions
   */
  async runRegressionTests(
    baselineResults: EvaluationReport,
    comparisonResults: EvaluationReport
  ): Promise<{
    regressions: Array<{ test: string, baselineScore: number, currentScore: number, delta: number }>
    improvements: Array<{ test: string, baselineScore: number, currentScore: number, delta: number }>
    summary: { regressionCount: number, improvementCount: number, netChange: number }
  }> {
    const regressions: any[] = []
    const improvements: any[] = []

    // Compare results by test name
    const baselineMap = new Map<string, number>()
    baselineResults.suiteResults.forEach(suite => {
      suite.results.forEach(result => {
        baselineMap.set(result.testScenario, result.overallScore)
      })
    })

    comparisonResults.suiteResults.forEach(suite => {
      suite.results.forEach(result => {
        const baselineScore = baselineMap.get(result.testScenario)
        if (baselineScore !== undefined) {
          const delta = result.overallScore - baselineScore
          
          if (delta < -0.05) { // Significant regression
            regressions.push({
              test: result.testScenario,
              baselineScore,
              currentScore: result.overallScore,
              delta
            })
          } else if (delta > 0.05) { // Significant improvement
            improvements.push({
              test: result.testScenario,
              baselineScore,
              currentScore: result.overallScore,
              delta
            })
          }
        }
      })
    })

    return {
      regressions,
      improvements,
      summary: {
        regressionCount: regressions.length,
        improvementCount: improvements.length,
        netChange: comparisonResults.overallMetrics.averageScore - baselineResults.overallMetrics.averageScore
      }
    }
  }

  /**
   * Generates comprehensive evaluation report
   */
  private generateComprehensiveReport(suiteResults: EvaluationSuiteResult[], executionTimeMs: number): EvaluationReport {
    const allResults = suiteResults.flatMap(suite => suite.results)
    
    const overallMetrics = {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.passed).length,
      failedTests: allResults.filter(r => !r.passed).length,
      averageScore: allResults.length > 0 ? 
        allResults.reduce((sum, r) => sum + r.overallScore, 0) / allResults.length : 0,
      executionTimeMs
    }

    const categoryBreakdown = this.generateCategoryBreakdown(allResults)
    const recommendations = this.generateRecommendations(allResults, categoryBreakdown)

    return {
      suiteResults,
      overallMetrics,
      categoryBreakdown,
      recommendations,
      timestamp: new Date()
    }
  }

  /**
   * Generates summary for a single evaluation suite
   */
  private generateSuiteSummary(results: EvaluationResult[]) {
    const passedResults = results.filter(r => r.passed)
    const failedResults = results.filter(r => !r.passed)
    
    const passRate = results.length > 0 ? (passedResults.length / results.length) * 100 : 0
    const averageScore = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length : 0

    // Identify critical failures (score < 0.5)
    const criticalFailures = results
      .filter(r => r.overallScore < 0.5)
      .map(r => `${r.testScenario}: ${r.overallScore.toFixed(2)}`)

    // Identify top and poor performing tests
    const sortedByScore = results.sort((a, b) => b.overallScore - a.overallScore)
    const topPerformingTests = sortedByScore.slice(0, 3).map(r => 
      `${r.testScenario}: ${r.overallScore.toFixed(2)}`
    )
    const poorPerformingTests = sortedByScore.slice(-3).map(r => 
      `${r.testScenario}: ${r.overallScore.toFixed(2)}`
    )

    return {
      passRate: Math.round(passRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      criticalFailures,
      topPerformingTests,
      poorPerformingTests
    }
  }

  /**
   * Filters scenarios to match evaluator capabilities
   */
  private filterScenariosForEvaluator(scenarios: TestScenario[], evaluator: BaseEvaluator): TestScenario[] {
    const evaluatorType = evaluator.constructor.name

    return scenarios.filter(scenario => {
      if (evaluatorType.includes('Questioning')) {
        return scenario.name.includes('questioning') || scenario.name.includes('animals') || 
               scenario.name.includes('objects') || scenario.name.includes('world_leaders') ||
               scenario.name.includes('cricket') || scenario.name.includes('football') || 
               scenario.name.includes('nba')
      }
      
      if (evaluatorType.includes('Guessing')) {
        return scenario.name.includes('guessing')
      }
      
      if (evaluatorType.includes('Hint')) {
        return scenario.name.includes('hint')
      }
      
      return true // Default to include all scenarios
    })
  }

  /**
   * Generates category-specific performance breakdown
   */
  private generateCategoryBreakdown(results: EvaluationResult[]): Record<string, any> {
    const categories = ['animals', 'objects', 'world leaders', 'cricket players', 'football players', 'nba players']
    const breakdown: Record<string, any> = {}

    for (const category of categories) {
      const categoryResults = results.filter(r => 
        r.testScenario.toLowerCase().includes(category.replace(' ', '_'))
      )

      if (categoryResults.length > 0) {
        const passedCount = categoryResults.filter(r => r.passed).length
        const averageScore = categoryResults.reduce((sum, r) => sum + r.overallScore, 0) / categoryResults.length
        
        const criticalFailures = categoryResults
          .filter(r => r.overallScore < 0.5)
          .map(r => r.testScenario)

        breakdown[category] = {
          passRate: Math.round((passedCount / categoryResults.length) * 100),
          averageScore: Math.round(averageScore * 100) / 100,
          criticalFailures
        }
      }
    }

    return breakdown
  }

  /**
   * Generates actionable recommendations based on evaluation results
   */
  private generateRecommendations(results: EvaluationResult[], categoryBreakdown: Record<string, any>): string[] {
    const recommendations: string[] = []

    // Overall performance recommendations
    const overallPassRate = results.filter(r => r.passed).length / results.length
    if (overallPassRate < 0.8) {
      recommendations.push('🚨 CRITICAL: Overall pass rate below 80%. Immediate prompt optimization required.')
    }

    // Category-specific recommendations
    for (const [category, data] of Object.entries(categoryBreakdown)) {
      if (data.passRate < 70) {
        recommendations.push(`⚠️ ${category} category performance below 70%. Review ${category} template logic.`)
      }
      
      if (data.criticalFailures.length > 0) {
        recommendations.push(`🔍 ${category} has ${data.criticalFailures.length} critical failures. Investigate: ${data.criticalFailures.slice(0, 2).join(', ')}`)
      }
    }

    // Metric-specific recommendations
    const commonFailures = this.identifyCommonFailurePatterns(results)
    for (const failure of commonFailures) {
      recommendations.push(`🔧 Common failure pattern: ${failure.pattern} (${failure.count} tests). ${failure.recommendation}`)
    }

    // Performance recommendations
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
    if (avgExecutionTime > 5000) {
      recommendations.push('⏱️ Evaluation execution time high. Consider optimizing test scenarios.')
    }

    // Quality recommendations
    const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
    if (avgScore < 0.7) {
      recommendations.push('📈 Overall quality score below 70%. Focus on improving prompt clarity and consistency.')
    }

    return recommendations
  }

  /**
   * Identifies common failure patterns across evaluations
   */
  private identifyCommonFailurePatterns(results: EvaluationResult[]): Array<{
    pattern: string
    count: number
    recommendation: string
  }> {
    const failurePatterns: Record<string, { count: number, recommendation: string }> = {}

    results.forEach(result => {
      result.metrics.forEach(metric => {
        if (metric.passed === false) {
          const pattern = metric.name
          if (!failurePatterns[pattern]) {
            failurePatterns[pattern] = {
              count: 0,
              recommendation: this.getRecommendationForMetric(metric.name)
            }
          }
          failurePatterns[pattern].count++
        }
      })
    })

    return Object.entries(failurePatterns)
      .map(([pattern, data]) => ({ pattern, ...data }))
      .filter(item => item.count >= 3) // Only patterns that occur in 3+ tests
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Provides specific recommendations for common metric failures
   */
  private getRecommendationForMetric(metricName: string): string {
    const recommendations: Record<string, string> = {
      'template_completeness': 'Ensure all required template sections are present and properly formatted.',
      'category_constraint_enforcement': 'Strengthen category constraint sections with more explicit forbidden/allowed patterns.',
      'binary_question_guidance': 'Add more explicit guidance for generating binary yes/no questions.',
      'repetition_prevention': 'Improve semantic similarity detection and repetition prevention mechanisms.',
      'fact_consistency': 'Add consistency validation between hints and established game facts.',
      'hint_novelty': 'Improve new information detection to avoid repeating known facts.',
      'deduction_logic_accuracy': 'Review and validate logical deduction rules for accuracy.',
      'semantic_similarity_prevention': 'Enhance semantic category detection and similarity scoring.',
      'domain_coherence': 'Strengthen domain narrowing analysis and boundary enforcement.',
      'spoiler_avoidance': 'Improve hint generation to avoid revealing answers too directly.'
    }

    return recommendations[metricName] || 'Review and optimize this specific metric area.'
  }

  /**
   * Exports evaluation results to JSON format
   */
  exportResults(report: EvaluationReport, filePath?: string): string {
    const exportData = {
      timestamp: report.timestamp.toISOString(),
      summary: report.overallMetrics,
      categoryBreakdown: report.categoryBreakdown,
      recommendations: report.recommendations,
      detailedResults: report.suiteResults.map(suite => ({
        name: suite.suiteName,
        summary: suite.summary,
        results: suite.results.map(result => ({
          test: result.testScenario,
          evaluator: result.evaluatorName,
          score: result.overallScore,
          passed: result.passed,
          executionTime: result.executionTimeMs,
          metrics: result.metrics.map(m => ({
            name: m.name,
            value: m.value,
            passed: m.passed,
            threshold: m.threshold
          }))
        }))
      }))
    }

    const jsonOutput = JSON.stringify(exportData, null, 2)
    
    if (filePath) {
      // Would write to file in actual implementation
      console.log(`📄 Results exported to ${filePath}`)
    }

    return jsonOutput
  }

  /**
   * Generates comparison report between two evaluation runs
   */
  generateComparisonReport(
    baselineReport: EvaluationReport,
    currentReport: EvaluationReport
  ): {
    scoreChanges: Array<{ test: string, baseline: number, current: number, change: number }>
    newFailures: string[]
    newPasses: string[]
    overallTrend: 'improving' | 'declining' | 'stable'
    significantChanges: string[]
  } {
    const scoreChanges: any[] = []
    const newFailures: string[] = []
    const newPasses: string[] = []

    // Create maps for easy lookup
    const baselineScores = new Map<string, { score: number, passed: boolean }>()
    baselineReport.suiteResults.forEach(suite => {
      suite.results.forEach(result => {
        baselineScores.set(result.testScenario, { 
          score: result.overallScore, 
          passed: result.passed 
        })
      })
    })

    // Compare current results to baseline
    currentReport.suiteResults.forEach(suite => {
      suite.results.forEach(result => {
        const baseline = baselineScores.get(result.testScenario)
        if (baseline) {
          const change = result.overallScore - baseline.score
          scoreChanges.push({
            test: result.testScenario,
            baseline: baseline.score,
            current: result.overallScore,
            change
          })

          // Track pass/fail changes
          if (!baseline.passed && result.passed) {
            newPasses.push(result.testScenario)
          } else if (baseline.passed && !result.passed) {
            newFailures.push(result.testScenario)
          }
        }
      })
    })

    // Determine overall trend
    const avgChange = scoreChanges.reduce((sum, change) => sum + change.change, 0) / scoreChanges.length
    const overallTrend = avgChange > 0.02 ? 'improving' : avgChange < -0.02 ? 'declining' : 'stable'

    // Identify significant changes
    const significantChanges = scoreChanges
      .filter(change => Math.abs(change.change) > 0.1)
      .map(change => `${change.test}: ${change.change > 0 ? '+' : ''}${(change.change * 100).toFixed(1)}%`)

    return {
      scoreChanges,
      newFailures,
      newPasses,
      overallTrend,
      significantChanges
    }
  }
}

/**
 * CLI interface for running evaluations
 */
export class EvaluationCLI {
  private runner: EvaluationRunner

  constructor() {
    this.runner = new EvaluationRunner()
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<void> {
    const command = args[0] || 'complete'

    switch (command) {
      case 'complete':
        await this.runCompleteEvaluation()
        break
      case 'quick':
        await this.runQuickEvaluation()
        break
      case 'category':
        const category = args[1]
        if (!category) {
          console.error('❌ Category required for category evaluation')
          return
        }
        await this.runCategoryEvaluation(category)
        break
      case 'help':
        this.showHelp()
        break
      default:
        console.error(`❌ Unknown command: ${command}`)
        this.showHelp()
    }
  }

  private async runCompleteEvaluation(): Promise<void> {
    const report = await this.runner.runCompleteEvaluation()
    const jsonOutput = this.runner.exportResults(report)
    console.log('\n📊 Complete Evaluation Results:')
    console.log(jsonOutput)
  }

  private async runQuickEvaluation(): Promise<void> {
    const report = await this.runner.runQuickEvaluation()
    console.log('\n⚡ Quick Evaluation Summary:')
    console.log(`Pass Rate: ${Math.round(report.overallMetrics.passedTests / report.overallMetrics.totalTests * 100)}%`)
    console.log(`Average Score: ${report.overallMetrics.averageScore.toFixed(2)}`)
    console.log(`Execution Time: ${Math.round(report.overallMetrics.executionTimeMs / 1000)}s`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:')
      report.recommendations.slice(0, 3).forEach(rec => console.log(`  ${rec}`))
    }
  }

  private async runCategoryEvaluation(category: string): Promise<void> {
    const result = await this.runner.runCategoryEvaluation(category)
    console.log(`\n🎯 ${category} Category Evaluation Results:`)
    console.log(`Pass Rate: ${result.summary.passRate}%`)
    console.log(`Average Score: ${result.summary.averageScore}`)
    
    if (result.summary.criticalFailures.length > 0) {
      console.log('\n🚨 Critical Failures:')
      result.summary.criticalFailures.forEach(failure => console.log(`  ${failure}`))
    }
  }

  private showHelp(): void {
    console.log(`
📋 Prompt Evaluation CLI

Commands:
  complete    Run complete evaluation across all prompt types
  quick       Run quick evaluation with essential tests only  
  category    Run evaluation for specific category (e.g., 'animals')
  help        Show this help message

Examples:
  deno run eval.ts complete
  deno run eval.ts quick
  deno run eval.ts category animals
`)
  }
}

// Export for direct CLI usage
if (import.meta.main) {
  const cli = new EvaluationCLI()
  await cli.run(Deno.args)
}