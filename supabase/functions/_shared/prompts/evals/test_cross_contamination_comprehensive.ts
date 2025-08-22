/**
 * Comprehensive cross-contamination test to verify complete prevention
 * Tests all possible category boundary violations
 */

import { ComprehensiveQuestionValidator } from '../../logic/ComprehensiveQuestionValidator.ts'

async function testCrossContaminationComprehensive() {
  console.log('🔍 COMPREHENSIVE CROSS-CONTAMINATION TEST')
  console.log('Testing ALL possible category boundary violations...\n')
  
  const validator = new ComprehensiveQuestionValidator(false) // Fast testing
  
  const testCases = [
    {
      category: 'animals',
      title: 'ANIMALS Category - Testing Biological/Human/Object Questions',
      shouldBlockQuestions: [
        // Human attributes (people contamination)
        'Are they alive?', 'Are they human?', 'Are they famous?', 'Do they have a job?', 
        'Are they married?', 'Do they have children?', 'Are they politicians?',
        'Were they born in 1950?', 'Are they retired?', 'Do they speak English?',
        'Are they wealthy?', 'Do they have a college degree?', 'Are they celebrities?',
        
        // Object properties (object contamination)
        'Are they electronic?', 'Are they made of metal?', 'Are they expensive?',
        'Do they need batteries?', 'Are they manufactured?', 'Are they digital?',
        'Do they have screens?', 'Are they waterproof?', 'Do they break easily?',
        'Are they made of plastic?', 'Do they need electricity?', 'Are they tools?',
        
        // Impossible for animals
        'Do they drive cars?', 'Do they use computers?', 'Do they watch TV?',
        'Do they cook food?', 'Do they wear clothes?', 'Do they read books?'
      ],
      shouldAllowQuestions: [
        // Valid animal questions
        'Is it a mammal?', 'Does it live in water?', 'Is it carnivorous?',
        'Is it large?', 'Is it wild?', 'Does it have fur?', 'Can it fly?',
        'Is it domesticated?', 'Does it hibernate?', 'Is it nocturnal?'
      ]
    },
    
    {
      category: 'objects',
      title: 'OBJECTS Category - Testing Biological/Human Questions',
      shouldBlockQuestions: [
        // Biological attributes (animal/people contamination)
        'Are they alive?', 'Do they breathe?', 'Do they eat?', 'Do they sleep?',
        'Do they reproduce?', 'Do they grow?', 'Do they age?', 'Do they die?',
        'Are they born?', 'Do they have parents?', 'Do they feel pain?',
        'Do they have emotions?', 'Are they conscious?', 'Do they think?',
        
        // Human attributes (people contamination)
        'Are they male?', 'Are they female?', 'Do they have names?',
        'Are they married?', 'Do they have jobs?', 'Are they famous?',
        'Do they speak languages?', 'Are they educated?', 'Do they vote?',
        
        // Animal behaviors (animal contamination)
        'Do they hunt?', 'Are they wild?', 'Do they migrate?', 'Are they predators?',
        'Do they hibernate?', 'Are they nocturnal?', 'Do they have territories?',
        'Are they carnivorous?', 'Do they mate?', 'Are they domesticated?'
      ],
      shouldAllowQuestions: [
        // Valid object questions
        'Is it made of metal?', 'Is it electronic?', 'Is it expensive?',
        'Can you hold it?', 'Is it fragile?', 'Is it waterproof?',
        'Does it have moving parts?', 'Is it used daily?', 'Is it heavy?'
      ]
    },
    
    {
      category: 'world leaders',
      title: 'WORLD LEADERS Category - Testing Animal/Object Questions', 
      shouldBlockQuestions: [
        // Animal behaviors/attributes (animal contamination)
        'Do they hibernate?', 'Do they migrate?', 'Are they carnivorous?',
        'Do they hunt?', 'Are they wild?', 'Are they domesticated?',
        'Do they have fur?', 'Do they lay eggs?', 'Can they fly?',
        'Are they nocturnal?', 'Do they have claws?', 'Are they mammals?',
        'Do they live in packs?', 'Are they territorial?', 'Do they molt?',
        
        // Object properties (object contamination)
        'Are they made of metal?', 'Are they electronic?', 'Do they need batteries?',
        'Are they manufactured?', 'Are they waterproof?', 'Do they break?',
        'Are they expensive to buy?', 'Do they have screens?', 'Are they digital?',
        'Are they made of plastic?', 'Do they need electricity?', 'Are they tools?',
        
        // Redundant biological questions (all people are alive)
        'Are they alive?', 'Do they breathe?', 'Do they have blood?'
      ],
      shouldAllowQuestions: [
        // Valid people questions
        'Are they male?', 'Are they from Europe?', 'Were they president?',
        'Are they still alive?', 'Did they serve in wartime?', 'Are they controversial?',
        'Were they democratically elected?', 'Are they over 70?', 'Did they write books?'
      ]
    },
    
    {
      category: 'cricket players',
      title: 'CRICKET PLAYERS Category - Testing Animal/Object Questions',
      shouldBlockQuestions: [
        // Animal contamination
        'Do they hibernate?', 'Are they carnivorous?', 'Do they hunt prey?',
        'Are they wild?', 'Are they domesticated?', 'Do they migrate?',
        'Do they have fur?', 'Can they fly?', 'Are they nocturnal?',
        
        // Object contamination
        'Are they made of metal?', 'Are they electronic?', 'Do they need batteries?',
        'Are they manufactured?', 'Do they break easily?', 'Are they waterproof?',
        'Do they have screens?', 'Are they digital devices?', 'Do they need power?',
        
        // Redundant
        'Are they alive?', 'Do they breathe?', 'Are they human?'
      ],
      shouldAllowQuestions: [
        // Valid cricket player questions
        'Are they currently active?', 'Are they Indian?', 'Are they a batsman?',
        'Have they been captain?', 'Did they play in IPL?', 'Are they retired?',
        'Did they play international cricket?', 'Are they fast bowlers?'
      ]
    },
    
    {
      category: 'nba players',
      title: 'NBA PLAYERS Category - Testing Animal/Object Questions',
      shouldBlockQuestions: [
        // Animal contamination
        'Do they hibernate?', 'Are they predators?', 'Do they hunt?',
        'Are they wild animals?', 'Do they migrate seasonally?', 'Are they carnivorous?',
        
        // Object contamination  
        'Are they electronic?', 'Do they need batteries?', 'Are they made of plastic?',
        'Do they have circuits?', 'Are they manufactured?', 'Do they break?',
        
        // Redundant
        'Are they alive?', 'Are they human beings?', 'Do they have blood?'
      ],
      shouldAllowQuestions: [
        // Valid NBA player questions
        'Are they currently active?', 'Are they over 30?', 'Do they play for Lakers?',
        'Are they point guards?', 'Have they won championships?', 'Are they All-Stars?'
      ]
    }
  ]
  
  let totalTests = 0
  let blockedCorrectly = 0
  let allowedCorrectly = 0
  let failures: Array<{category: string, question: string, expected: string, actual: string}> = []
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.title}`)
    console.log('─'.repeat(60))
    
    // Test questions that SHOULD be blocked
    console.log(`\n🚫 Testing ${testCase.shouldBlockQuestions.length} questions that SHOULD be BLOCKED:`)
    for (const question of testCase.shouldBlockQuestions) {
      totalTests++
      const result = await validator.validateQuestion(question, [], testCase.category, [])
      
      if (!result.isValid) {
        blockedCorrectly++
        console.log(`   ✅ BLOCKED: "${question}"`)
        if (result.issues.length > 0) {
          console.log(`      Reason: ${result.issues[0].description}`)
        }
      } else {
        failures.push({
          category: testCase.category,
          question,
          expected: 'BLOCKED',
          actual: 'ALLOWED'
        })
        console.log(`   ❌ FAILED TO BLOCK: "${question}" (This is cross-contamination!)`)
      }
    }
    
    // Test questions that SHOULD be allowed
    console.log(`\n✅ Testing ${testCase.shouldAllowQuestions.length} questions that SHOULD be ALLOWED:`)
    for (const question of testCase.shouldAllowQuestions) {
      totalTests++
      const result = await validator.validateQuestion(question, [], testCase.category, [])
      
      if (result.isValid) {
        allowedCorrectly++
        console.log(`   ✅ ALLOWED: "${question}"`)
      } else {
        failures.push({
          category: testCase.category,
          question,
          expected: 'ALLOWED',
          actual: 'BLOCKED'
        })
        console.log(`   ❌ INCORRECTLY BLOCKED: "${question}"`)
        if (result.issues.length > 0) {
          console.log(`      Reason: ${result.issues[0].description}`)
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CROSS-CONTAMINATION TEST RESULTS')
  console.log('='.repeat(80))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Questions Blocked Correctly: ${blockedCorrectly}`)
  console.log(`Questions Allowed Correctly: ${allowedCorrectly}`)
  console.log(`Total Correct: ${blockedCorrectly + allowedCorrectly}`)
  console.log(`Total Failures: ${failures.length}`)
  console.log(`Success Rate: ${Math.round((blockedCorrectly + allowedCorrectly) / totalTests * 100)}%`)
  
  if (failures.length === 0) {
    console.log('\n🎉 CROSS-CONTAMINATION COMPLETELY FIXED!')
    console.log('✅ All category boundaries properly enforced')
    console.log('✅ No biological questions for objects')
    console.log('✅ No object questions for people/animals') 
    console.log('✅ No animal questions for people/objects')
  } else {
    console.log('\n⚠️  CROSS-CONTAMINATION ISSUES FOUND:')
    console.log('The following questions were handled incorrectly:')
    
    for (const failure of failures) {
      console.log(`   ❌ ${failure.category}: "${failure.question}"`)
      console.log(`      Expected: ${failure.expected}, Got: ${failure.actual}`)
    }
    
    // Group failures by type
    const contaminationFailures = failures.filter(f => f.expected === 'BLOCKED')
    const overblockingFailures = failures.filter(f => f.expected === 'ALLOWED')
    
    if (contaminationFailures.length > 0) {
      console.log(`\n🚨 CRITICAL: ${contaminationFailures.length} cross-contamination questions NOT blocked!`)
    }
    
    if (overblockingFailures.length > 0) {
      console.log(`\n⚠️  WARNING: ${overblockingFailures.length} valid questions incorrectly blocked`)
    }
  }
  
  console.log('\n📊 Category Breakdown:')
  for (const testCase of testCases) {
    const categoryFailures = failures.filter(f => f.category === testCase.category)
    const categoryTotal = testCase.shouldBlockQuestions.length + testCase.shouldAllowQuestions.length
    const categoryCorrect = categoryTotal - categoryFailures.length
    console.log(`   ${testCase.category}: ${categoryCorrect}/${categoryTotal} (${Math.round(categoryCorrect/categoryTotal*100)}%)`)
  }
}

// Run the test if executed directly
if (import.meta.main) {
  await testCrossContaminationComprehensive()
}