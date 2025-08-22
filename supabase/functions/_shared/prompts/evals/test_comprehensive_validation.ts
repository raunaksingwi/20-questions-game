/**
 * Comprehensive test for the three-layer validation system:
 * 1. Enhanced LLM prompts
 * 2. LLM-based similarity checking
 * 3. Manual hardcoded detection
 */

import { ComprehensiveQuestionValidator, ValidationResult } from '../../logic/ComprehensiveQuestionValidator.ts'

async function testComprehensiveValidation() {
  console.log('🚀 Testing Comprehensive Question Validation System\n')
  
  const validator = new ComprehensiveQuestionValidator(false) // Disable LLM for faster testing
  
  // Test cases for different categories
  const testCases = [
    {
      category: 'animals',
      previousQuestions: ['Is it large?', 'Is it wild?', 'Does it eat meat?'],
      testQuestions: [
        // Should PASS
        { question: 'Is it a mammal?', shouldPass: true, reason: 'Valid animal classification question' },
        { question: 'Does it live in Africa?', shouldPass: true, reason: 'Valid habitat question' },
        { question: 'Is it endangered?', shouldPass: true, reason: 'Valid conservation status question' },
        
        // Should FAIL - Semantic duplicates
        { question: 'Is it big?', shouldPass: false, reason: 'Semantic duplicate of "Is it large?"' },
        { question: 'Is it huge?', shouldPass: false, reason: 'Semantic duplicate of "Is it large?"' },
        { question: 'Is it untamed?', shouldPass: false, reason: 'Semantic duplicate of "Is it wild?"' },
        { question: 'Is it carnivorous?', shouldPass: false, reason: 'Semantic duplicate of "Does it eat meat?"' },
        { question: 'Is it a predator?', shouldPass: false, reason: 'Semantic duplicate of "Does it eat meat?"' },
        
        // Should FAIL - Category contamination
        { question: 'Are they alive?', shouldPass: false, reason: 'Category contamination - all animals are alive' },
        { question: 'Are they human?', shouldPass: false, reason: 'Category contamination - humans not in animals' },
        { question: 'Do they have a job?', shouldPass: false, reason: 'Category contamination - animals don\'t have jobs' },
        { question: 'Are they electronic?', shouldPass: false, reason: 'Category contamination - animals not electronic' },
        { question: 'Are they made of metal?', shouldPass: false, reason: 'Category contamination - animals not manufactured' }
      ]
    },
    
    {
      category: 'objects',
      previousQuestions: ['Is it electronic?', 'Can you hold it?', 'Is it expensive?'],
      testQuestions: [
        // Should PASS
        { question: 'Is it made of plastic?', shouldPass: true, reason: 'Valid material question' },
        { question: 'Is it used in kitchens?', shouldPass: true, reason: 'Valid location/purpose question' },
        { question: 'Is it fragile?', shouldPass: true, reason: 'Valid durability question' },
        
        // Should FAIL - Semantic duplicates  
        { question: 'Is it digital?', shouldPass: false, reason: 'Semantic duplicate of "Is it electronic?"' },
        { question: 'Does it use electricity?', shouldPass: false, reason: 'Semantic duplicate of "Is it electronic?"' },
        { question: 'Is it handheld?', shouldPass: false, reason: 'Semantic duplicate of "Can you hold it?"' },
        { question: 'Is it portable?', shouldPass: false, reason: 'Semantic duplicate of "Can you hold it?"' },
        { question: 'Is it costly?', shouldPass: false, reason: 'Semantic duplicate of "Is it expensive?"' },
        
        // Should FAIL - Category contamination
        { question: 'Are they alive?', shouldPass: false, reason: 'Category contamination - objects not living' },
        { question: 'Do they eat?', shouldPass: false, reason: 'Category contamination - objects don\'t eat' },
        { question: 'Are they male?', shouldPass: false, reason: 'Category contamination - objects don\'t have gender' },
        { question: 'Do they have children?', shouldPass: false, reason: 'Category contamination - objects don\'t reproduce' },
        { question: 'Were they born?', shouldPass: false, reason: 'Category contamination - objects not born' }
      ]
    },
    
    {
      category: 'world leaders',
      previousQuestions: ['Are they from Europe?', 'Are they male?', 'Were they president?'],
      testQuestions: [
        // Should PASS
        { question: 'Are they still alive?', shouldPass: true, reason: 'Valid life status question' },
        { question: 'Did they serve in the 20th century?', shouldPass: true, reason: 'Valid time period question' },
        { question: 'Were they controversial?', shouldPass: true, reason: 'Valid opinion/reputation question' },
        
        // Should FAIL - Semantic duplicates
        { question: 'Are they European?', shouldPass: false, reason: 'Semantic duplicate of "Are they from Europe?"' },
        { question: 'Do they come from Europe?', shouldPass: false, reason: 'Semantic duplicate of "Are they from Europe?"' },
        { question: 'Are they a man?', shouldPass: false, reason: 'Semantic duplicate of "Are they male?"' },
        { question: 'Did they serve as president?', shouldPass: false, reason: 'Semantic duplicate of "Were they president?"' },
        { question: 'Did they hold the presidency?', shouldPass: false, reason: 'Semantic duplicate of "Were they president?"' },
        
        // Should FAIL - Category contamination
        { question: 'Do they eat meat?', shouldPass: false, reason: 'Category contamination - use appropriate dietary questions' },
        { question: 'Are they domesticated?', shouldPass: false, reason: 'Category contamination - people not animals' },
        { question: 'Are they made of metal?', shouldPass: false, reason: 'Category contamination - people not objects' },
        { question: 'Do they need electricity?', shouldPass: false, reason: 'Category contamination - people not electronic' }
      ]
    }
  ]
  
  let totalTests = 0
  let passedTests = 0
  
  for (const testCase of testCases) {
    console.log(`📋 Testing Category: ${testCase.category.toUpperCase()}`)
    console.log(`   Previous questions: ${testCase.previousQuestions.join(', ')}`)
    console.log()
    
    for (const test of testCase.testQuestions) {
      totalTests++
      
      try {
        const result = await validator.validateQuestion(
          test.question,
          testCase.previousQuestions,
          testCase.category,
          []
        )
        
        const actualPass = result.isValid
        const expectedPass = test.shouldPass
        const testPassed = actualPass === expectedPass
        
        if (testPassed) passedTests++
        
        const symbol = testPassed ? '✅' : '❌'
        const status = actualPass ? 'VALID' : 'INVALID'
        
        console.log(`   ${symbol} "${test.question}"`)
        console.log(`      Expected: ${expectedPass ? 'PASS' : 'FAIL'}, Got: ${status}`)
        console.log(`      Reason: ${test.reason}`)
        
        if (!testPassed) {
          console.log(`      Issues found: ${result.issues.map(i => i.description).join(', ')}`)
        }
        
        if (result.issues.length > 0 && testPassed) {
          console.log(`      Detected issues: ${result.issues.map(i => `${i.type}(${i.severity})`).join(', ')}`)
        }
        
        console.log(`      Confidence: ${Math.round(result.confidence * 100)}%`)
        console.log()
        
      } catch (error) {
        console.error(`   ❌ Error testing "${test.question}": ${error}`)
        console.log()
      }
    }
    
    console.log('─'.repeat(80))
    console.log()
  }
  
  // Summary
  console.log('📊 COMPREHENSIVE VALIDATION TEST RESULTS')
  console.log('='.repeat(80))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed Tests: ${passedTests}`)
  console.log(`Failed Tests: ${totalTests - passedTests}`)
  console.log(`Success Rate: ${Math.round(passedTests / totalTests * 100)}%`)
  console.log()
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! The comprehensive validation system is working correctly.')
  } else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed. Review the validation logic.`)
  }
  
  // Test validation stats
  console.log('\n📈 Testing Validation Statistics...')
  const mockResults: ValidationResult[] = [
    { isValid: true, issues: [], confidence: 0.9 },
    { isValid: false, issues: [{ type: 'semantic_duplicate', severity: 'critical', description: 'test' }], confidence: 0.8 },
    { isValid: false, issues: [{ type: 'category_contamination', severity: 'critical', description: 'test' }], confidence: 0.6 }
  ]
  
  const stats = ComprehensiveQuestionValidator.getValidationStats(mockResults)
  console.log('Sample stats:', stats)
}

// Run the test if this file is executed directly
if (import.meta.main) {
  await testComprehensiveValidation()
}