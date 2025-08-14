import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { LLMConfigLoader, LLMProviderFactory } from '../llm/index.ts'
import { PerformanceOptimizer } from './PerformanceOptimizer.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export abstract class EdgeFunctionBase {
  protected static supabase: SupabaseClient
  private static llmProviders: Map<string, any> = new Map()
  private static llmProviderErrors: Map<string, string> = new Map()
  private static initialized = false

  static initialize(): SupabaseClient {
    if (!this.supabase) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: { 
          schema: 'public'
          // Note: removed poolSize as it's not a valid Supabase client option
        },
        global: { 
          headers: { 
            'x-statement-timeout': '3s', // Reduced timeout
            'x-client-info': 'edge-function'
          } 
        }
      })
      
      // Warm up the function on first initialization
      if (!this.initialized) {
        this.initialized = true
        PerformanceOptimizer.warmup().catch(console.warn)
      }
    }
    return this.supabase
  }

  static getLLMProvider(functionName: string): any {
    const cachedError = this.llmProviderErrors.get(functionName)
    if (cachedError) {
      throw new Error(cachedError)
    }
    
    let provider = this.llmProviders.get(functionName)
    if (!provider) {
      try {
        const llmConfig = LLMConfigLoader.loadConfig(functionName)
        provider = LLMProviderFactory.createProvider(llmConfig)
        this.llmProviders.set(functionName, provider)
        console.log(`✅ LLM provider initialized successfully for ${functionName}`)
      } catch (error) {
        const errorMessage = `Failed to initialize LLM provider: ${error instanceof Error ? error.message : String(error)}`
        this.llmProviderErrors.set(functionName, errorMessage)
        console.error(`❌ LLM provider initialization failed for ${functionName}:`, error)
        throw new Error(errorMessage)
      }
    }
    
    return provider
  }

  static handleCors(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    return null
  }

  static createErrorResponse(error: Error, status: number = 400): Response {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
    )
  }

  static createSuccessResponse(data: any): Response {
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
}