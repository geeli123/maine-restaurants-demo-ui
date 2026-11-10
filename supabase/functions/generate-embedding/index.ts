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

const KNOWN_WIZARD_PHRASES = [
  'outdoor or patio seating',
  'gluten-free options',
  'vegan or vegetarian',
  'sit-down restaurant',
  'bakery/cafe cuisine',
  'romantic atmosphere',
  'upscale atmosphere',
  'special occasion',
  'pub food cuisine',
  'american cuisine',
  'seafood cuisine',
  'italian cuisine',
  'mexican cuisine',
  'lively atmosphere',
  'casual atmosphere',
  'trendy atmosphere',
  'best restaurants',
  'other cuisine',
  'asian cuisine',
  'cozy atmosphere',
  'divey atmosphere',
  'kid-friendly',
  'pet-friendly',
  'food truck',
  'year-round',
  'budget',
]

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'to', 'was', 'were', 'will', 'with',
])

/**
 * Extract structured wizard phrases and search keywords from query text
 */
function extractKeywords(text: string, providedKeywords?: unknown): string[] {
  const keywords: string[] = []
  const seen = new Set<string>()

  const addKeyword = (kw: string) => {
    const cleaned = kw.trim().toLowerCase()
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned)
      keywords.push(cleaned)
    }
  }

  if (Array.isArray(providedKeywords)) {
    for (const kw of providedKeywords) {
      if (typeof kw === 'string') addKeyword(kw)
    }
  }

  const lower = text.trim().toLowerCase()
  let remaining = lower

  // Match known multi-word wizard phrases first, preserving their order in the query
  const matchedPhrases: { phrase: string; index: number }[] = []
  for (const phrase of KNOWN_WIZARD_PHRASES) {
    const idx = remaining.indexOf(phrase)
    if (idx !== -1) {
      matchedPhrases.push({ phrase, index: lower.indexOf(phrase) })
      remaining = remaining.replace(phrase, ' ')
    }
  }

  matchedPhrases
    .sort((a, b) => a.index - b.index)
    .forEach(({ phrase }) => addKeyword(phrase))

  // Extract any remaining freeform search words
  const extraTokens = remaining
    .split(/[\s,.;:!?()"']+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  for (const token of extraTokens) {
    addKeyword(token)
  }

  return keywords
}

/**
 * Record search query and keywords in public.search_analytics
 */
async function logSearchAnalytics(params: {
  queryText: string
  normalizedQuery: string
  queryHash: string
  keywords: string[]
  cacheHit: boolean
  req: Request
}) {
  if (!supabase) return

  try {
    const userAgent = params.req.headers.get('user-agent') || null
    const referer = params.req.headers.get('referer') || null

    const { error } = await supabase
      .from('search_analytics')
      .insert({
        query_text: params.queryText,
        normalized_query: params.normalizedQuery,
        query_hash: params.queryHash,
        keywords: params.keywords,
        cache_hit: params.cacheHit,
        user_agent: userAgent,
        referer: referer,
      })

    if (error) {
      console.warn('Failed to insert search analytics:', error.message)
    }
  } catch (err) {
    console.warn('Error logging search analytics:', err)
  }
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
    const { text, keywords: providedKeywords } = await req.json()

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input: text must be a non-empty string')
    }

    // Validate text length (Gemini has limits)
    if (text.length > 10000) {
      throw new Error('Text too long: maximum 10,000 characters allowed')
    }

    const normalizedText = text.trim()
    const lowercaseQuery = normalizedText.toLowerCase()
    const queryHash = await computeSha256(normalizedText)
    const keywords = extractKeywords(normalizedText, providedKeywords)

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
            // Update cache hit stats and record search analytics in parallel
            await Promise.allSettled([
              supabase
                .from('query_embeddings_cache')
                .update({
                  hit_count: (cachedRow.hit_count || 1) + 1,
                  last_accessed_at: new Date().toISOString()
                })
                .eq('query_hash', queryHash),
              logSearchAnalytics({
                queryText: normalizedText,
                normalizedQuery: lowercaseQuery,
                queryHash,
                keywords,
                cacheHit: true,
                req
              })
            ])

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

    // 3. Store newly generated embedding in Supabase cache and record search analytics
    if (supabase) {
      await Promise.allSettled([
        supabase
          .from('query_embeddings_cache')
          .insert({
            query_text: normalizedText,
            query_hash: queryHash,
            embedding: embedding
          })
          .then(({ error }) => {
            if (error) console.warn('Failed to insert embedding into cache table:', error.message)
          }),
        logSearchAnalytics({
          queryText: normalizedText,
          normalizedQuery: lowercaseQuery,
          queryHash,
          keywords,
          cacheHit: false,
          req
        })
      ])
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
