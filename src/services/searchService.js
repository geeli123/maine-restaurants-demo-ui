import { supabase } from '../config/supabase'

/**
 * Search restaurant reviews using vector similarity
 * @param {number[]} embedding - Query embedding vector (768 dimensions)
 * @param {number} matchThreshold - Similarity threshold (0-1), default 0.7
 * @param {number} matchCount - Maximum number of results to return, default 10
 * @returns {Promise<Array>} - Matching restaurant reviews sorted by relevance
 * @throws {Error} - If database search fails
 */
export async function searchRestaurants(
  embedding,
  matchThreshold = 0.5,
  matchCount = 10
) {
  // Validate embedding
  if (!embedding || !Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error('Invalid embedding: must be an array of 768 numbers')
  }

  // Validate parameters
  if (matchThreshold < 0 || matchThreshold > 1) {
    throw new Error('Match threshold must be between 0 and 1')
  }

  if (matchCount < 1 || matchCount > 100) {
    throw new Error('Match count must be between 1 and 100')
  }

  try {
    // Call Supabase RPC function for vector similarity search
    const { data, error } = await supabase.rpc('search_restaurant_reviews', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) {
      console.error('Database search error:', error)
      throw new Error(`Database search failed: ${error.message}`)
    }

    return data || []
  } catch (error) {
    // Re-throw with context if not already an Error object
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Restaurant search failed: ${String(error)}`)
  }
}

/**
 * Hybrid search combining text matching and vector similarity
 * @param {string} searchQuery - Text search query
 * @param {number[]} embedding - Query embedding vector (768 dimensions)
 * @param {number} matchCount - Maximum number of results to return, default 10
 * @returns {Promise<Array>} - Matching restaurant reviews sorted by relevance
 * @throws {Error} - If database search fails
 */
export async function hybridSearchRestaurants(
  searchQuery,
  embedding,
  matchCount = 10
) {
  // Validate inputs
  if (!searchQuery || typeof searchQuery !== 'string') {
    throw new Error('Search query must be a non-empty string')
  }

  if (!embedding || !Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error('Invalid embedding: must be an array of 768 numbers')
  }

  if (matchCount < 1 || matchCount > 100) {
    throw new Error('Match count must be between 1 and 100')
  }

  try {
    // Call Supabase RPC function for hybrid search
    const { data, error } = await supabase.rpc('hybrid_search_restaurant_reviews', {
      search_query: searchQuery,
      query_embedding: embedding,
      match_count: matchCount
    })

    if (error) {
      console.error('Hybrid search error:', error)
      throw new Error(`Hybrid search failed: ${error.message}`)
    }

    return data || []
  } catch (error) {
    // Re-throw with context if not already an Error object
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Hybrid restaurant search failed: ${String(error)}`)
  }
}
