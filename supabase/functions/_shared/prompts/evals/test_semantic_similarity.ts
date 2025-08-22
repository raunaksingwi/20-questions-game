/**
 * Test runner specifically for semantic similarity detection
 * Run this to verify that the system can detect duplicate questions with different wording
 */

import { SemanticSimilarityEvaluator } from './SemanticSimilarityEvaluator.ts'
import { SemanticSimilarityDetector } from './QuestioningEvaluator.ts'

async function runSemanticSimilarityTests() {
  console.log('🔍 Running Semantic Similarity Detection Tests...\n')
  
  const evaluator = new SemanticSimilarityEvaluator()
  const testScenarios = SemanticSimilarityEvaluator.createTestScenarios()
  
  console.log(`Running ${testScenarios.length} test scenarios:\n`)
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`)
    console.log(`   Description: ${scenario.description}`)
    console.log(`   Already asked: ${scenario.alreadyAskedQuestions.join(', ')}`)
    
    try {
      const metrics = await evaluator['collectMetrics'](scenario)
      
      console.log('   Results:')
      for (const metric of metrics) {
        const threshold = metric.threshold || 0.8
        const status = metric.value >= threshold ? '✅' : '❌'
        const percentage = Math.round(metric.value * 100)
        console.log(`     ${status} ${metric.name}: ${percentage}% (target: ${Math.round(threshold * 100)}%)`)
        
        if (metric.value < threshold) {
          console.log(`       Description: ${metric.description}`)
        }
      }
      
      // Show detailed results for test questions
      console.log('\n   🔍 Detailed Question Analysis:')
      for (const testQ of scenario.testQuestions) {
        const isDetected = scenario.alreadyAskedQuestions.some(prevQ => 
          SemanticSimilarityDetector.areQuestionsSimilar(testQ.question, prevQ)
        )
        
        const expectedSymbol = testQ.shouldBeFlagged ? '🔴' : '🟢'
        const actualSymbol = isDetected ? '🔴' : '🟢'
        const correctSymbol = (isDetected === testQ.shouldBeFlagged) ? '✅' : '❌'
        
        console.log(`     ${correctSymbol} "${testQ.question}"`)
        console.log(`       Expected: ${expectedSymbol} ${testQ.shouldBeFlagged ? 'DUPLICATE' : 'UNIQUE'}`)
        console.log(`       Detected: ${actualSymbol} ${isDetected ? 'DUPLICATE' : 'UNIQUE'}`)
        console.log(`       Reason: ${testQ.reason}`)
        
        if (isDetected !== testQ.shouldBeFlagged) {
          console.log(`       ⚠️  MISMATCH: Expected ${testQ.shouldBeFlagged}, got ${isDetected}`)
        }
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('🎯 SUMMARY: Semantic Similarity Detection Test Complete')
  console.log('='.repeat(80))
}

// Quick unit tests for the similarity detector
function runUnitTests() {
  console.log('\n🧪 Running Unit Tests for SemanticSimilarityDetector...\n')
  
  const testCases = [
    // Should detect as similar
    { q1: 'Are they from Europe?', q2: 'Are they European?', expected: true, reason: 'Nationality synonyms' },
    { q1: 'Is it big?', q2: 'Is it large?', expected: true, reason: 'Size synonyms' },
    { q1: 'Are they male?', q2: 'Are they a man?', expected: true, reason: 'Gender synonyms' },
    { q1: 'Were they president?', q2: 'Did they serve as president?', expected: true, reason: 'Grammar variation' },
    { q1: 'Is it electronic?', q2: 'Does it use electricity?', expected: true, reason: 'Concept variation' },
    { q1: 'Can you hold it?', q2: 'Is it handheld?', expected: true, reason: 'Action to adjective' },
    { q1: 'Are they currently active?', q2: 'Are they still playing?', expected: true, reason: 'Active/playing synonyms' },
    
    // Should NOT detect as similar
    { q1: 'Are they from Europe?', q2: 'Are they alive?', expected: false, reason: 'Different concepts' },
    { q1: 'Is it big?', q2: 'Is it expensive?', expected: false, reason: 'Size vs cost' },
    { q1: 'Are they male?', q2: 'Are they tall?', expected: false, reason: 'Gender vs height' },
    { q1: 'Were they president?', q2: 'Were they controversial?', expected: false, reason: 'Role vs opinion' },
    { q1: 'Is it electronic?', q2: 'Is it fragile?', expected: false, reason: 'Electronic vs durability' }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of testCases) {
    const result = SemanticSimilarityDetector.areQuestionsSimilar(test.q1, test.q2)
    const isCorrect = result === test.expected
    
    if (isCorrect) {
      passed++
      console.log(`✅ PASS: "${test.q1}" vs "${test.q2}"`)
      console.log(`   Expected: ${test.expected}, Got: ${result} - ${test.reason}`)
    } else {
      failed++
      console.log(`❌ FAIL: "${test.q1}" vs "${test.q2}"`)
      console.log(`   Expected: ${test.expected}, Got: ${result} - ${test.reason}`)
    }
  }
  
  console.log(`\n📊 Unit Test Results: ${passed} passed, ${failed} failed`)
  console.log(`   Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`)
}

// Main test runner
if (import.meta.main) {
  console.log('🚀 Starting Semantic Similarity Detection Tests\n')
  
  // Run unit tests first
  runUnitTests()
  
  // Then run comprehensive scenario tests
  await runSemanticSimilarityTests()
  
  console.log('\n✨ All tests completed!')
}