#!/usr/bin/env -S deno run --allow-env --allow-net

import { LLMConfigLoader } from './config.ts'
import { LLMProviderFactory } from './factory.ts'
import { ResponseParser } from './response-parser.ts'

async function testProvider(providerName: 'anthropic' | 'openai') {
  console.log(`\n🧪 Testing ${providerName.toUpperCase()} provider...`)
  
  try {
    // Temporarily set the provider
    const originalProvider = Deno.env.get('LLM_PROVIDER')
    Deno.env.set('LLM_PROVIDER', providerName)
    
    // Load config and create provider
    const config = LLMConfigLoader.loadConfig()
    const provider = LLMProviderFactory.createProvider(config)
    
    console.log(`✅ Provider created: ${provider.name}`)
    console.log(`📋 Config validation: ${provider.validateConfig() ? 'PASSED' : 'FAILED'}`)
    
    // Test a simple game question
    const testMessages = [
      {
        role: 'system' as const,
        content: 'You are playing 20 Questions. The secret item is "apple". Answer questions with Yes/No and respond in JSON format: {"answer": "Yes/No", "is_guess": false}. Only set is_guess to true if the user makes a direct guess and it\'s correct.'
      },
      {
        role: 'user' as const,
        content: 'Is it a fruit?'
      }
    ]
    
    console.log('🤖 Testing LLM response...')
    const response = await provider.generateResponse({
      messages: testMessages,
      temperature: 0.1,
      maxTokens: 50
    })
    
    console.log(`✅ Raw response: "${response.content}"`)
    
    // Test response parsing
    const parsedResponse = ResponseParser.parseGameResponse(response.content)
    console.log(`✅ Parsed response:`, parsedResponse)
    
    if (response.usage) {
      console.log(`📊 Token usage:`, response.usage)
    }
    
    // Restore original provider
    if (originalProvider) {
      Deno.env.set('LLM_PROVIDER', originalProvider)
    } else {
      Deno.env.delete('LLM_PROVIDER')
    }
    
    return true
  } catch (error) {
    console.log(`❌ Error testing ${providerName}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Testing LLM Provider Architecture')
  console.log('=====================================')
  
  // Check environment setup
  const validation = LLMConfigLoader.validateEnvironment()
  if (!validation.valid) {
    console.log('⚠️  Missing environment variables:', validation.missing.join(', '))
    console.log('📝 Please check your .env file and ensure all required API keys are set')
  }
  
  const results = []
  
  // Test Anthropic if API key is available
  if (Deno.env.get('ANTHROPIC_API_KEY')) {
    results.push(await testProvider('anthropic'))
  } else {
    console.log('\n⚠️  Skipping Anthropic test - ANTHROPIC_API_KEY not found')
    results.push(false)
  }
  
  // Test OpenAI if API key is available
  if (Deno.env.get('OPENAI_API_KEY')) {
    results.push(await testProvider('openai'))
  } else {
    console.log('\n⚠️  Skipping OpenAI test - OPENAI_API_KEY not found')
    results.push(false)
  }
  
  console.log('\n📋 Test Results Summary')
  console.log('=======================')
  console.log(`Anthropic: ${results[0] ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`OpenAI: ${results[1] ? '✅ PASSED' : '❌ FAILED'}`)
  
  const passedTests = results.filter(r => r).length
  console.log(`\n🎯 Overall: ${passedTests}/2 providers working`)
  
  if (passedTests > 0) {
    console.log('🎉 Hot-swappable LLM provider architecture is working!')
  } else {
    console.log('💡 Set up API keys in .env to test the providers')
  }
}

if (import.meta.main) {
  await main()
}