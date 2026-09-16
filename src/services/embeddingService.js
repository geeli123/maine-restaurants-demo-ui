import { supabase } from '../config/supabase'

// In-memory cache for the current browser session
const sessionEmbeddingCache = new Map()

/**
 * Generate embedding vector from text using Gemini API via Supabase Edge Function
 * (Cached in-memory and in Supabase query_embeddings_cache table)
 * @param {string} text - Search query text
 * @returns {Promise<number[]>} - 768-dimensional embedding vector
 * @throws {Error} - If embedding generation fails
 */
export async function generateEmbedding(text) {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Search text cannot be empty')
  }

  // Validate text length
  if (text.length > 10000) {
    throw new Error('Search text is too long (maximum 10,000 characters)')
  }

  const normalized = text.trim().toLowerCase()

  // Check browser session cache first (0ms latency, 0 network calls)
  if (sessionEmbeddingCache.has(normalized)) {
    return sessionEmbeddingCache.get(normalized)
  }

  try {
    // Call Supabase Edge Function (which checks query_embeddings_cache table before Gemini API)
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text: text.trim() }
    })

    if (error) {
      console.error('Edge Function error:', error)
      throw new Error(`Failed to generate embedding: ${error.message}`)
    }

    // Validate response
    if (!data || !data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response format from server')
    }

    // Verify dimension
    if (data.embedding.length !== 768) {
      throw new Error(
        `Invalid embedding dimension: expected 768, got ${data.embedding.length}`
      )
    }

    // Store in browser session cache
    sessionEmbeddingCache.set(normalized, data.embedding)

    return data.embedding
  } catch (error) {
    // Re-throw with context if not already an Error object
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Embedding generation failed: ${String(error)}`)
  }
}
