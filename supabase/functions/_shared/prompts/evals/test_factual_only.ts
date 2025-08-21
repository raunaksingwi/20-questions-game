#!/usr/bin/env -S deno run --allow-all

import { EvaluationRunner } from "./EvaluationRunner.ts"

// Create evaluation runner and run complete evaluation
const runner = new EvaluationRunner()
const report = await runner.runCompleteEvaluation()

// Filter for factual accuracy results
const factualSuite = report.suiteResults.find(s => s.suiteName === 'Factual_Answer_Accuracy')

if (factualSuite) {
  console.log("🎯 Factual Answer Accuracy Suite Results:")
  console.log(`Pass Rate: ${(factualSuite.summary.passRate * 100).toFixed(1)}%`)
  console.log(`Average Score: ${factualSuite.summary.averageScore.toFixed(3)}`)
  console.log(`\n📊 Detailed Results:`)

  for (const result of factualSuite.results.slice(0, 8)) {
    console.log(`\n🧪 ${result.testScenario}: ${result.overallScore.toFixed(3)}`)
    for (const metric of result.metrics) {
      const status = metric.passed ? "✅" : "❌"
      console.log(`  ${metric.name}: ${metric.value.toFixed(2)} ${status}`)
    }
  }
} else {
  console.log("❌ Factual accuracy suite not found!")
}