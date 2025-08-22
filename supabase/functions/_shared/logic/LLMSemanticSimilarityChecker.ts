/**
 * LLM-based semantic similarity checker that uses AI to detect if questions are semantically similar.
 * This provides a more flexible and intelligent approach than hardcoded rules.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

export interface SimilarityCheckResult {
  isSimilar: boolean
  confidence: number
  reasoning: string
  suggestedAlternative?: string
}

export class LLMSemanticSimilarityChecker {
  private supabase: any

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Use environment variables or provided credentials
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL')!
    const key = supabaseKey || Deno.env.get('SUPABASE_ANON_KEY')!
    this.supabase = createClient(url, key)
  }

  /**
   * Check if a new question is semantically similar to any previous questions
   */
  async checkQuestionSimilarity(
    newQuestion: string,
    previousQuestions: string[],
    category: string
  ): Promise<SimilarityCheckResult> {
    if (previousQuestions.length === 0) {
      return {
        isSimilar: false,
        confidence: 1.0,
        reasoning: 'No previous questions to compare against'
      }
    }

    const prompt = this.buildSimilarityCheckPrompt(newQuestion, previousQuestions, category)
    
    try {
      const { data, error } = await this.supabase.functions.invoke('openai-completion', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are an expert at detecting semantic similarity between questions. You must determine if questions ask about the same concept, even if worded differently.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-4',
          temperature: 0.1, // Low temperature for consistent results
          max_tokens: 300
        }
      })

      if (error) {
        console.error('LLM similarity check error:', error)
        // Fallback to manual checker if LLM fails
        return this.fallbackToManualCheck(newQuestion, previousQuestions)
      }

      return this.parseResponse(data.choices[0].message.content)
      
    } catch (error) {
      console.error('LLM similarity check failed:', error)
      return this.fallbackToManualCheck(newQuestion, previousQuestions)
    }
  }

  /**
   * Build the prompt for semantic similarity checking
   */
  private buildSimilarityCheckPrompt(
    newQuestion: string,
    previousQuestions: string[],
    category: string
  ): string {
    return `TASK: Determine if the NEW QUESTION is semantically similar to any PREVIOUS QUESTIONS.

CATEGORY: ${category}

PREVIOUS QUESTIONS:
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

NEW QUESTION: "${newQuestion}"

SEMANTIC SIMILARITY EXAMPLES:
❌ SIMILAR: "Are they from Europe?" vs "Are they European?" (same concept - geographic origin)
❌ SIMILAR: "Is it big?" vs "Is it large?" (same concept - size)
❌ SIMILAR: "Is it electronic?" vs "Does it use electricity?" (same concept - electrical device)
❌ SIMILAR: "Were they president?" vs "Did they serve as president?" (same concept - presidential role)
❌ SIMILAR: "Does it eat meat?" vs "Is it carnivorous?" (same concept - diet)

✅ DIFFERENT: "Are they from Europe?" vs "Are they alive?" (different concepts - geography vs life status)
✅ DIFFERENT: "Is it big?" vs "Is it expensive?" (different concepts - size vs cost)
✅ DIFFERENT: "Is it electronic?" vs "Is it fragile?" (different concepts - technology vs durability)

RESPOND IN THIS EXACT FORMAT:
SIMILAR: [YES/NO]
CONFIDENCE: [0.0-1.0]
REASONING: [Brief explanation of why they are/aren't similar]
ALTERNATIVE: [If similar, suggest a different question, otherwise write "N/A"]

ANALYSIS:`
  }

  /**
   * Parse the LLM response into a structured result
   */
  private parseResponse(response: string): SimilarityCheckResult {
    try {
      const lines = response.split('\n').map(line => line.trim())
      
      const similarLine = lines.find(line => line.startsWith('SIMILAR:'))
      const confidenceLine = lines.find(line => line.startsWith('CONFIDENCE:'))
      const reasoningLine = lines.find(line => line.startsWith('REASONING:'))
      const alternativeLine = lines.find(line => line.startsWith('ALTERNATIVE:'))

      const isSimilar = similarLine?.includes('YES') || false
      const confidence = parseFloat(confidenceLine?.split(':')[1]?.trim() || '0.5')
      const reasoning = reasoningLine?.split(':')[1]?.trim() || 'Unable to parse reasoning'
      const alternative = alternativeLine?.split(':')[1]?.trim()

      return {
        isSimilar,
        confidence,
        reasoning,
        suggestedAlternative: alternative !== 'N/A' ? alternative : undefined
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error)
      return {
        isSimilar: false,
        confidence: 0.5,
        reasoning: 'Failed to parse LLM response'
      }
    }
  }

  /**
   * Fallback to manual checker if LLM fails
   */
  private fallbackToManualCheck(
    newQuestion: string,
    previousQuestions: string[]
  ): SimilarityCheckResult {
    // Import and use the manual SemanticSimilarityDetector as fallback
    // This would import the detector we built earlier
    
    for (const prevQuestion of previousQuestions) {
      // Basic synonym check as fallback
      if (this.basicSimilarityCheck(newQuestion, prevQuestion)) {
        return {
          isSimilar: true,
          confidence: 0.7,
          reasoning: 'Detected similarity using fallback manual checker'
        }
      }
    }

    return {
      isSimilar: false,
      confidence: 0.8,
      reasoning: 'No similarity detected by fallback checker'
    }
  }

  /**
   * Basic similarity check for fallback
   */
  private basicSimilarityCheck(q1: string, q2: string): boolean {
    const normalize = (s: string) => 
      s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(is|it|a|an|the|does|do|can|will|would|they|he|she|are|were|was|did|have|has|had)\b/g, '')
        .trim()

    const n1 = normalize(q1)
    const n2 = normalize(q2)

    // Basic checks
    if (n1 === n2) return true
    if (n1.includes(n2) || n2.includes(n1)) return true

    // Basic synonym checks
    const synonymPairs = [
      ['big', 'large'], ['huge', 'massive'], ['electronic', 'digital'],
      ['from', 'european'], ['male', 'man'], ['president', 'serve'],
      ['carnivorous', 'meat'], ['hold', 'portable'], ['active', 'playing']
    ]

    for (const [word1, word2] of synonymPairs) {
      if ((n1.includes(word1) && n2.includes(word2)) || 
          (n1.includes(word2) && n2.includes(word1))) {
        return true
      }
    }

    return false
  }

  /**
   * Batch check multiple questions for efficiency
   */
  async batchCheckQuestions(
    questions: string[],
    previousQuestions: string[],
    category: string
  ): Promise<SimilarityCheckResult[]> {
    const results: SimilarityCheckResult[] = []
    
    for (const question of questions) {
      const result = await this.checkQuestionSimilarity(question, previousQuestions, category)
      results.push(result)
      
      // If this question is unique, add it to the previous questions for next checks
      if (!result.isSimilar) {
        previousQuestions.push(question)
      }
    }
    
    return results
  }

  /**
   * Get similarity score between two specific questions
   */
  async getQuestionSimilarityScore(
    question1: string,
    question2: string,
    category: string
  ): Promise<number> {
    const result = await this.checkQuestionSimilarity(question1, [question2], category)
    return result.isSimilar ? result.confidence : 1 - result.confidence
  }
}