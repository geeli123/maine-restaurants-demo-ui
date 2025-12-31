import { useState } from 'react'
import { generateEmbedding } from '../services/embeddingService'
import { hybridSearchRestaurants } from '../services/searchService'

/**
 * Custom hook for restaurant search functionality
 * Manages search state and orchestrates embedding generation + database search
 */
export function useRestaurantSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * Perform a restaurant search
   * @param {string} query - Search query text
   * @param {Object} options - Search options
   * @param {number} options.matchCount - Maximum results to return
   * @returns {Promise<Array>} - Search results
   */
  const performSearch = async (query, options = {}) => {
    const {
      matchCount = 10
    } = options

    // Reset error state
    setError(null)
    setLoading(true)
    setSearchQuery(query)

    try {
      // Step 1: Generate embedding from search text
      const embedding = await generateEmbedding(query)

      // Step 2: Search database using hybrid search
      const searchResults = await hybridSearchRestaurants(
        query,
        embedding,
        matchCount
      )

      setResults(searchResults)
      setLoading(false)

      return searchResults
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred during search'
      setError(errorMessage)
      setResults([])
      setLoading(false)
      console.error('Search failed:', err)

      return []
    }
  }

  /**
   * Clear search results and reset state
   */
  const clearSearch = () => {
    setResults([])
    setError(null)
    setSearchQuery('')
  }

  return {
    results,
    loading,
    error,
    searchQuery,
    performSearch,
    clearSearch
  }
}
