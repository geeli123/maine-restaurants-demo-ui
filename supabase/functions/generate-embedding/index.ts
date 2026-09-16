import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Compute SHA-256 hash of normalized text for exact matching
 */
async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Safely parse embedding vector from database response
 */
function parseEmbedding(val: any): number[] | null {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return val
        .replace(/[\[\]]/g, '')
        .split(',')
        .map((n) => parseFloat(n.trim()))
        .filter((n) => !isNaN(n))
    }
  }
  return null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { text } = await req.json()

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input: text must be a non-empty string')
    }

    // Validate text length (Gemini has limits)
    if (text.length > 10000) {
      throw new Error('Text too long: maximum 10,000 characters allowed')
    }

    const normalizedText = text.trim()
    const queryHash = await computeSha256(normalizedText)

    // 1. Check Supabase query_embeddings_cache table
    if (supabase) {
      try {
        const { data: cachedRow, error: cacheErr } = await supabase
          .from('query_embeddings_cache')
          .select('embedding, hit_count')
          .eq('query_hash', queryHash)
          .maybeSingle()

        if (!cacheErr && cachedRow && cachedRow.embedding) {
          const cachedEmbedding = parseEmbedding(cachedRow.embedding)
          if (cachedEmbedding && cachedEmbedding.length === 768) {
            // Update hit count and last_accessed_at in the background
            supabase
              .from('query_embeddings_cache')
              .update({
                hit_count: (cachedRow.hit_count || 1) + 1,
                last_accessed_at: new Date().toISOString()
              })
              .eq('query_hash', queryHash)
              .then(() => {})
              .catch((err: any) => console.warn('Failed to update cache hit stats:', err))

            return new Response(
              JSON.stringify({ embedding: cachedEmbedding, cached: true }),
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              }
            )
          }
        }
      } catch (cacheLookupErr) {
        console.warn('Embedding cache lookup encountered an error; proceeding to API:', cacheLookupErr)
      }
    }

    // 2. Cache Miss: Check for API key and call Gemini API
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{
            text: normalizedText
          }]
        },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: 768,
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    // Extract embedding from response
    if (!data.embedding || !data.embedding.values) {
      throw new Error('Invalid response format from Gemini API')
    }

    const embedding = data.embedding.values

    // Verify embedding dimension (should be 768 for embedding-001)
    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimension: expected 768, got ${embedding.length}`)
    }

    // 3. Store newly generated embedding in Supabase cache
    if (supabase) {
      try {
        await supabase
          .from('query_embeddings_cache')
          .insert({
            query_text: normalizedText,
            query_hash: queryHash,
            embedding: embedding
          })
      } catch (insertErr) {
        console.warn('Failed to insert embedding into cache table:', insertErr)
      }
    }

    // Return successful response
    return new Response(
      JSON.stringify({ embedding, cached: false }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  } catch (error) {
    console.error('Error in generate-embedding function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})
