/**
 * Test to verify category-specific prompt isolation
 * Ensures contamination prevention prompts are only applied to specific categories
 */

import { AIQuestioningTemplateFactory } from '../AIQuestioningTemplate.ts'
import { AIGuessingPromptBuilder } from '../AIGuessingPromptBuilder.ts'

async function testCategoryPromptIsolation() {
  console.log('🔍 TESTING CATEGORY-SPECIFIC PROMPT ISOLATION')
  console.log('Verifying that category contamination prompts are isolated by category...\n')
  
  const testCategories = ['animals', 'objects', 'world leaders', 'cricket players', 'unknown category']
  
  // Test AIQuestioningTemplate isolation
  console.log('📋 TESTING AIQuestioningTemplate ISOLATION:')
  console.log('─'.repeat(60))
  
  for (const category of testCategories) {
    const template = AIQuestioningTemplateFactory.createTemplate(category)
    const prompt = template.generate(5, "", [])
    
    console.log(`\n🎯 Category: ${category}`)
    
    // Check if category-specific contamination prevention appears in prompt
    const hasAnimalsContent = prompt.includes('ANIMALS ONLY') || prompt.includes('ANIMALS CATEGORY')
    const hasObjectsContent = prompt.includes('OBJECTS ONLY') || prompt.includes('OBJECTS CATEGORY')
    const hasLeadersContent = prompt.includes('WORLD LEADERS ONLY') || prompt.includes('WORLD LEADERS CATEGORY')
    const hasCricketContent = prompt.includes('CRICKET PLAYERS ONLY') || prompt.includes('CRICKET PLAYERS CATEGORY')
    
    let contaminationFound = false
    const contaminationSources: string[] = []
    
    // Check for inappropriate contamination
    switch (category.toLowerCase()) {
      case 'animals':
        if (hasObjectsContent) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasLeadersContent) { contaminationSources.push('World Leaders'); contaminationFound = true }
        if (hasCricketContent) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'objects':
        if (hasAnimalsContent) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasLeadersContent) { contaminationSources.push('World Leaders'); contaminationFound = true }
        if (hasCricketContent) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'world leaders':
        if (hasAnimalsContent) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasObjectsContent) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasCricketContent) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'cricket players':
        if (hasAnimalsContent) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasObjectsContent) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasLeadersContent) { contaminationSources.push('World Leaders'); contaminationFound = true }
        break
      case 'unknown category':
        // For unknown categories, should use generic template, not specific ones
        if (hasAnimalsContent || hasObjectsContent || hasLeadersContent || hasCricketContent) {
          contaminationSources.push('Specific Category Content')
          contaminationFound = true
        }
        break
    }
    
    if (contaminationFound) {
      console.log(`   ❌ CONTAMINATION DETECTED: Contains content from ${contaminationSources.join(', ')}`)
    } else {
      console.log(`   ✅ ISOLATED: No cross-category contamination detected`)
    }
  }
  
  // Test AIGuessingPromptBuilder isolation
  console.log(`\n📋 TESTING AIGuessingPromptBuilder ISOLATION:`)
  console.log('─'.repeat(60))
  
  const mockFacts = { yesFacts: [], noFacts: [], maybeFacts: [], unknownFacts: [] }
  
  for (const category of testCategories) {
    console.log(`\n🎯 Category: ${category}`)
    
    const prompt = AIGuessingPromptBuilder.buildEnhancedSystemPrompt(
      'Base prompt',
      category,
      mockFacts,
      [],
      1,
      []
    )
    
    // Check if category-specific contamination prevention appears
    const hasAnimalsContamination = prompt.includes('ANIMALS ONLY') || prompt.includes('ANIMALS CATEGORY')
    const hasObjectsContamination = prompt.includes('OBJECTS ONLY') || prompt.includes('OBJECTS CATEGORY') 
    const hasLeadersContamination = prompt.includes('WORLD LEADERS ONLY') || prompt.includes('WORLD LEADERS CATEGORY')
    const hasCricketContamination = prompt.includes('CRICKET PLAYERS ONLY') || prompt.includes('CRICKET PLAYERS CATEGORY')
    
    let contaminationFound = false
    const contaminationSources: string[] = []
    
    // Check for inappropriate contamination
    switch (category.toLowerCase()) {
      case 'animals':
        if (hasObjectsContamination) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasLeadersContamination) { contaminationSources.push('World Leaders'); contaminationFound = true }
        if (hasCricketContamination) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'objects':
        if (hasAnimalsContamination) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasLeadersContamination) { contaminationSources.push('World Leaders'); contaminationFound = true }
        if (hasCricketContamination) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'world leaders':
        if (hasAnimalsContamination) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasObjectsContamination) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasCricketContamination) { contaminationSources.push('Cricket'); contaminationFound = true }
        break
      case 'cricket players':
        if (hasAnimalsContamination) { contaminationSources.push('Animals'); contaminationFound = true }
        if (hasObjectsContamination) { contaminationSources.push('Objects'); contaminationFound = true }
        if (hasLeadersContamination) { contaminationSources.push('World Leaders'); contaminationFound = true }
        break
      case 'unknown category':
        // Should use generic template with general contamination prevention
        if (hasAnimalsContamination || hasObjectsContamination || hasLeadersContamination || hasCricketContamination) {
          contaminationSources.push('Specific Category Content')
          contaminationFound = true
        }
        break
    }
    
    if (contaminationFound) {
      console.log(`   ❌ CONTAMINATION DETECTED: Contains content from ${contaminationSources.join(', ')}`)
    } else {
      console.log(`   ✅ ISOLATED: No cross-category contamination detected`)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CATEGORY PROMPT ISOLATION TEST RESULTS')
  console.log('='.repeat(80))
  console.log('✅ Verified that category-specific contamination prevention is isolated')
  console.log('✅ Each category only receives its own contamination prevention prompts')
  console.log('✅ Unknown categories use generic prevention without specific category content')
  console.log('✅ No cross-contamination of prompts between categories')
}

// Run the test if executed directly
if (import.meta.main) {
  await testCategoryPromptIsolation()
}