#!/usr/bin/env -S deno run --allow-all

import { FactualAnswerEvaluator } from "./FactualAnswerEvaluator.ts"
import { FactualAccuracyTests } from "./TestScenarios.ts"

const evaluator = new FactualAnswerEvaluator()
const scenarios = FactualAccuracyTests.createFactualAccuracyTests()

console.log("🧪 Testing factual accuracy evaluation:")
for (const scenario of scenarios.slice(0, 5)) {
  console.log(`\n📋 Testing: ${scenario.name}`)
  const result = await evaluator.evaluateScenario(scenario)
  console.log(`📊 Score: ${result.overallScore.toFixed(2)}`)
  result.metrics.forEach(m => {
    const status = m.passed ? "✅ PASS" : "❌ FAIL"
    console.log(`  ${m.name}: ${m.value.toFixed(2)} ${status} (threshold: ${m.threshold})`)
  })
}