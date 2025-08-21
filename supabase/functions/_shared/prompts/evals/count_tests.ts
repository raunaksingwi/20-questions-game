#!/usr/bin/env -S deno run --allow-all

import { EvaluationRunner } from "./EvaluationRunner.ts"
import { FactualAccuracyTests } from "./TestScenarios.ts"

// Count all test scenarios
const runner = new EvaluationRunner()
const report = await runner.runCompleteEvaluation()

console.log("📊 Test Scenario Count Summary:")
console.log(`🎯 Total Tests: ${report.overallMetrics.totalTests}`)
console.log(`📈 Average Score: ${report.overallMetrics.averageScore.toFixed(3)}`)
console.log("")

// Break down by suite
for (const suite of report.suiteResults) {
  console.log(`📋 ${suite.suiteName}: ${suite.results.length} tests`)
}

console.log("")

// Count factual accuracy tests specifically
const factualTests = FactualAccuracyTests.createFactualAccuracyTests()
const edgeCaseTests = FactualAccuracyTests.createFactualEdgeCaseTests()

console.log("🧪 Factual Accuracy Test Breakdown:")
console.log(`  Main Tests: ${factualTests.length}`)
console.log(`  Edge Cases: ${edgeCaseTests.length}`)
console.log(`  Total Factual: ${factualTests.length + edgeCaseTests.length}`)

// Count questions per test
let totalQuestions = 0
for (const test of factualTests) {
  totalQuestions += test.factualQuestions.length
}
for (const test of edgeCaseTests) {
  totalQuestions += test.factualQuestions.length
}

console.log(`  Total Questions: ${totalQuestions}`)
console.log(`  Avg Questions/Test: ${(totalQuestions / (factualTests.length + edgeCaseTests.length)).toFixed(1)}`)