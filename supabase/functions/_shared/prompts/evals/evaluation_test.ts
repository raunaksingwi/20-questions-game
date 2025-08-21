/**
 * Test script for validating the evaluation system functionality.
 * Runs sample evaluations to ensure all components work correctly.
 */

import { QuestioningEvaluator, CategoryQuestioningEvaluator } from './QuestioningEvaluator.ts'
import { GuessingEvaluator } from './GuessingEvaluator.ts'
import { HintEvaluator } from './HintEvaluator.ts'
import { GoldenTestSets } from './TestScenarios.ts'
import { EvaluationRunner } from './EvaluationRunner.ts'

/**
 * Runs a sample evaluation to test system functionality
 */
async function runSampleEvaluation(): Promise<void> {
  console.log('🧪 Testing Evaluation System...\n')

  // Test 1: Questioning Evaluator
  console.log('1️⃣ Testing Questioning Evaluator...')
  const questioningEvaluator = new CategoryQuestioningEvaluator('animals')
  const questioningScenarios = questioningEvaluator.createCategoryTestScenarios()
  
  if (questioningScenarios.length > 0) {
    const questioningResult = await questioningEvaluator.evaluateScenario(questioningScenarios[0])
    console.log(`   ✅ Animals questioning evaluation: ${questioningResult.passed ? 'PASSED' : 'FAILED'} (Score: ${questioningResult.overallScore.toFixed(2)})`)
    console.log(`   📊 Metrics: ${questioningResult.metrics.length} collected`)
  }

  // Test 2: Guessing Evaluator
  console.log('\n2️⃣ Testing Guessing Evaluator...')
  const guessingEvaluator = new GuessingEvaluator()
  const guessingScenarios = GoldenTestSets.createGuessingGoldenTests()
  
  if (guessingScenarios.length > 0) {
    const guessingResult = await guessingEvaluator.evaluateScenario(guessingScenarios[0])
    console.log(`   ✅ Guessing evaluation: ${guessingResult.passed ? 'PASSED' : 'FAILED'} (Score: ${guessingResult.overallScore.toFixed(2)})`)
    console.log(`   📊 Metrics: ${guessingResult.metrics.length} collected`)
  }

  // Test 3: Hint Evaluator
  console.log('\n3️⃣ Testing Hint Evaluator...')
  const hintEvaluator = new HintEvaluator()
  const hintScenarios = GoldenTestSets.createHintGoldenTests()
  
  if (hintScenarios.length > 0) {
    const hintResult = await hintEvaluator.evaluateScenario(hintScenarios[0])
    console.log(`   ✅ Hint evaluation: ${hintResult.passed ? 'PASSED' : 'FAILED'} (Score: ${hintResult.overallScore.toFixed(2)})`)
    console.log(`   📊 Metrics: ${hintResult.metrics.length} collected`)
  }

  // Test 4: Evaluation Runner
  console.log('\n4️⃣ Testing Evaluation Runner...')
  const runner = new EvaluationRunner()
  const quickReport = await runner.runQuickEvaluation()
  
  console.log(`   ✅ Quick evaluation completed: ${quickReport.overallMetrics.passedTests}/${quickReport.overallMetrics.totalTests} passed`)
  console.log(`   📈 Average score: ${quickReport.overallMetrics.averageScore.toFixed(2)}`)
  console.log(`   ⏱️ Execution time: ${Math.round(quickReport.overallMetrics.executionTimeMs / 1000)}s`)
  
  if (quickReport.recommendations.length > 0) {
    console.log(`   💡 Recommendations: ${quickReport.recommendations.length} generated`)
  }

  console.log('\n🎉 Evaluation system test completed successfully!')
  
  // Show sample metrics breakdown
  console.log('\n📋 Sample Metrics Breakdown:')
  if (quickReport.suiteResults.length > 0 && quickReport.suiteResults[0].results.length > 0) {
    const sampleResult = quickReport.suiteResults[0].results[0]
    console.log(`   Test: ${sampleResult.testScenario}`)
    console.log(`   Evaluator: ${sampleResult.evaluatorName}`)
    console.log(`   Overall Score: ${sampleResult.overallScore}`)
    console.log(`   Metrics (${sampleResult.metrics.length} total):`)
    
    sampleResult.metrics.slice(0, 5).forEach(metric => {
      const status = metric.passed === true ? '✅' : metric.passed === false ? '❌' : '⏸️'
      console.log(`     ${status} ${metric.name}: ${metric.value.toFixed(2)} ${metric.threshold ? `(threshold: ${metric.threshold})` : ''}`)
    })
    
    if (sampleResult.metrics.length > 5) {
      console.log(`     ... and ${sampleResult.metrics.length - 5} more metrics`)
    }
  }
}

/**
 * Validates all evaluation components work correctly
 */
async function validateEvaluationComponents(): Promise<boolean> {
  console.log('🔍 Validating Evaluation Components...\n')
  
  let allValid = true

  try {
    // Validate questioning evaluators for all categories
    const categories = ['animals', 'objects', 'world leaders', 'cricket players', 'football players', 'nba players']
    
    for (const category of categories) {
      const evaluator = new CategoryQuestioningEvaluator(category)
      const scenarios = evaluator.createCategoryTestScenarios()
      
      if (scenarios.length === 0) {
        console.log(`   ❌ ${category}: No test scenarios generated`)
        allValid = false
      } else {
        console.log(`   ✅ ${category}: ${scenarios.length} test scenarios generated`)
      }
    }

    // Validate test scenario generation
    const goldenQuestioningTests = GoldenTestSets.createQuestioningGoldenTests()
    const goldenGuessingTests = GoldenTestSets.createGuessingGoldenTests()
    const goldenHintTests = GoldenTestSets.createHintGoldenTests()
    
    console.log(`   ✅ Golden test sets: ${goldenQuestioningTests.length + goldenGuessingTests.length + goldenHintTests.length} scenarios`)

    // Validate benchmarks
    const benchmarks = GoldenTestSets.createPerformanceBenchmarks()
    const totalBenchmarks = benchmarks.questioning.length + benchmarks.guessing.length + benchmarks.hinting.length
    console.log(`   ✅ Performance benchmarks: ${totalBenchmarks} scenarios`)

    // Validate adversarial tests
    const adversarial = GoldenTestSets.createAdversarialTests()
    const totalAdversarial = adversarial.questioning.length + adversarial.guessing.length + adversarial.hinting.length
    console.log(`   ✅ Adversarial tests: ${totalAdversarial} scenarios`)

    console.log(`\n${allValid ? '✅' : '❌'} Component validation ${allValid ? 'completed successfully' : 'failed'}`)
    
  } catch (error) {
    console.error('❌ Validation error:', error)
    allValid = false
  }

  return allValid
}

/**
 * Demonstrates evaluation output formats
 */
async function demonstrateOutputFormats(): Promise<void> {
  console.log('\n📄 Demonstration of Output Formats...\n')

  const runner = new EvaluationRunner()
  
  // Generate sample report
  const sampleReport = await runner.runQuickEvaluation()
  
  // Show JSON export
  console.log('📋 JSON Export Sample:')
  const jsonOutput = runner.exportResults(sampleReport)
  const truncatedJson = jsonOutput.substring(0, 500) + '...'
  console.log(truncatedJson)
  
  // Show category breakdown
  console.log('\n📊 Category Breakdown Sample:')
  for (const [category, data] of Object.entries(sampleReport.categoryBreakdown)) {
    console.log(`   ${category}:`)
    console.log(`     Pass Rate: ${data.passRate}%`)
    console.log(`     Average Score: ${data.averageScore}`)
    if (data.criticalFailures.length > 0) {
      console.log(`     Critical Failures: ${data.criticalFailures.length}`)
    }
  }
  
  // Show recommendations
  if (sampleReport.recommendations.length > 0) {
    console.log('\n💡 Recommendations Sample:')
    sampleReport.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`)
    })
  }
}

// Main execution
if (import.meta.main) {
  console.log('🚀 20 Questions Prompt Evaluation System Test\n')
  
  try {
    // Step 1: Validate components
    const isValid = await validateEvaluationComponents()
    
    if (isValid) {
      // Step 2: Run sample evaluation
      await runSampleEvaluation()
      
      // Step 3: Demonstrate output formats
      await demonstrateOutputFormats()
      
      console.log('\n🎯 All tests completed successfully!')
      console.log('\n📚 Next steps:')
      console.log('   • Run "deno run --allow-all EvaluationRunner.ts complete" for full evaluation')
      console.log('   • Integrate evaluation into your development workflow')
      console.log('   • Set up CI/CD automation for continuous monitoring')
      
    } else {
      console.log('\n❌ Component validation failed. Please check the implementation.')
      Deno.exit(1)
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error)
    Deno.exit(1)
  }
}