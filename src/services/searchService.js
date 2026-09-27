import { supabase } from '../config/supabase.js'

/**
 * Helper to check whether a restaurant should be surfaced in search:
 * - Must NOT have a closed business status (e.g. CLOSED_TEMPORARILY, CLOSED_PERMANENTLY, or non-OPEN)
 * - Must NOT have DISCARDED or STAGING curation status (only ACTIVE or APPROVED)
 */
function isVisibleInSearch(item) {
  if (!item) return false

  // Business status check: do not surface closed business statuses
  if (item.business_status != null) {
    const bStatus = String(item.business_status).trim().toUpperCase()
    if (bStatus !== 'OPEN' || bStatus.includes('CLOSED')) {
      return false
    }
  }

  // Curation status check: do not surface discarded or staging curation status
  if (item.status != null) {
    const cStatus = String(item.status).trim().toUpperCase()
    if (cStatus === 'DISCARDED' || cStatus === 'STAGING') {
      return false
    }
    if (cStatus !== 'ACTIVE' && cStatus !== 'APPROVED') {
      return false
    }
  } else {
    // Missing status defaults to STAGING in database schema
    return false
  }

  return true
}

function sanitizeRestaurant(item) {
  // Also clean up nested reviews to exclude discarded or staging reviews
  if (Array.isArray(item.reviews)) {
    return {
      ...item,
      reviews: item.reviews.filter(rev => {
        if (!rev || !rev.status) return true
        const rStatus = String(rev.status).trim().toUpperCase()
        return rStatus !== 'DISCARDED' && rStatus !== 'STAGING'
      })
    }
  }
  return item
}

/**
 * Search restaurant reviews using vector similarity
 * @param {number[]} embedding - Query embedding vector (768 dimensions)
 * @param {number} matchThreshold - Similarity threshold (0-1)
 * @param {number} matchCount - Maximum number of results to return, default 10
 * @returns {Promise<Array>} - Matching restaurant reviews sorted by relevance
 * @throws {Error} - If database search fails
 */
export async function searchRestaurants(
  embedding,
  matchThreshold = 0.75,
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
    const { data, error } = await supabase.rpc('search_restaurants', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) {
      console.error('Database search error:', error)
      throw new Error(`Database search failed: ${error.message}`)
    }

    const results = (data || [])
      .filter(isVisibleInSearch)
      .map(sanitizeRestaurant)
    return results
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
  matchThreshold = 0.75,
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
    const { data, error } = await supabase.rpc('hybrid_search_restaurants', {
      search_query: searchQuery,
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) {
      console.error('Hybrid search error:', error)
      throw new Error(`Hybrid search failed: ${error.message}`)
    }

    const results = (data || [])
      .filter(isVisibleInSearch)
      .map(sanitizeRestaurant)
    return results
  } catch (error) {
    // Re-throw with context if not already an Error object
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Hybrid restaurant search failed: ${String(error)}`)
  }
}

