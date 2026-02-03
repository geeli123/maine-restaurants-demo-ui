// Main application logic
import { generateEmbedding } from './services/embeddingService.js'
import { hybridSearchRestaurants } from './services/searchService.js'
import {
  renderLoadingSpinner,
  renderErrorMessage,
  renderSearchResults,
  renderWelcomeMessage
} from './components/components.js'

// Application state
const state = {
  results: [],
  loading: false,
  error: null,
  searchQuery: '',
  matchCount: 10
}

// DOM element references (will be set after rendering)
let searchForm, searchInput, searchButton, clearButton, matchCountInput, matchCountDisplay, contentArea

// Render the entire app structure
function renderApp() {
  const root = document.getElementById('root')

  root.innerHTML = `
    <div class="app">
      <header class="app-header">
        <h1>Maine Restaurant Search</h1>
        <p class="subtitle">Currently serving Portland Maine</p>
      </header>

      <main class="app-main">
        <!-- Search Bar -->
        <form id="search-form" class="search-bar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              id="search-input"
              placeholder="Search for restaurants... (e.g., 'best seafood in Portland')"
              class="search-input"
            />
            <button
              type="button"
              id="clear-button"
              class="clear-button"
              aria-label="Clear search"
              style="display: none;"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <button type="submit" id="search-button" class="search-button">
            Search
          </button>
        </form>

        <!-- Advanced Options -->
        <details class="search-options">
          <summary>Advanced Options</summary>
          <div class="options-content">
            <label>
              <span>Max Results: <span id="match-count-display">10</span></span>
              <input
                type="number"
                id="match-count"
                min="1"
                max="50"
                value="10"
              />
            </label>
          </div>
        </details>

        <!-- Content Area (Loading/Error/Results) -->
        <div id="content-area"></div>
      </main>

      <footer class="app-footer">
        <p>:)</p>
      </footer>
    </div>
  `

  // Get DOM element references after rendering
  searchForm = document.getElementById('search-form')
  searchInput = document.getElementById('search-input')
  searchButton = document.getElementById('search-button')
  clearButton = document.getElementById('clear-button')
  matchCountInput = document.getElementById('match-count')
  matchCountDisplay = document.getElementById('match-count-display')
  contentArea = document.getElementById('content-area')
}

// Update UI based on state
function render() {
  // Update search button
  searchButton.disabled = state.loading || !searchInput.value.trim()
  searchButton.textContent = state.loading ? 'Searching...' : 'Search'

  // Update input disabled state
  searchInput.disabled = state.loading

  // Update clear button visibility
  clearButton.style.display = searchInput.value ? 'block' : 'none'

  // Update content area
  if (state.loading) {
    contentArea.innerHTML = renderLoadingSpinner()
  } else if (state.error && !state.loading) {
    contentArea.innerHTML = renderErrorMessage(state.error, true)
    // Add event listener to retry button
    const retryButton = document.getElementById('retry-button')
    if (retryButton) {
      retryButton.addEventListener('click', handleRetry)
    }
  } else if (!state.loading && !state.error && state.searchQuery) {
    contentArea.innerHTML = renderSearchResults(state.results, state.searchQuery)
  } else if (!state.loading && !state.error && !state.searchQuery) {
    contentArea.innerHTML = renderWelcomeMessage()
  }
}

// Perform search
async function performSearch(query) {
  // Reset error state
  state.error = null
  state.loading = true
  state.searchQuery = query
  render()

  try {
    // Step 1: Generate embedding from search text
    const embedding = await generateEmbedding(query)

    // Step 2: Search database using hybrid search
    const searchResults = await hybridSearchRestaurants(
      query,
      embedding,
      state.matchCount
    )

    state.results = searchResults
    state.loading = false
    render()

    return searchResults
  } catch (err) {
    const errorMessage = err.message || 'An unexpected error occurred during search'
    state.error = errorMessage
    state.results = []
    state.loading = false
    console.error('Search failed:', err)
    render()

    return []
  }
}

// Clear search
function clearSearch() {
  searchInput.value = ''
  state.results = []
  state.error = null
  state.searchQuery = ''
  render()
}

// Event handlers
function handleSubmit(e) {
  e.preventDefault()
  const query = searchInput.value.trim()
  if (query) {
    performSearch(query)
  }
}

function handleClear() {
  clearSearch()
}

function handleRetry() {
  if (state.searchQuery) {
    performSearch(state.searchQuery)
  }
}

function handleInputChange() {
  render()
}

function handleMatchCountChange() {
  state.matchCount = parseInt(matchCountInput.value) || 10
  matchCountDisplay.textContent = state.matchCount
}

// Initialize app
function init() {
  // Render the entire app
  renderApp()

  // Add event listeners
  searchForm.addEventListener('submit', handleSubmit)
  clearButton.addEventListener('click', handleClear)
  searchInput.addEventListener('input', handleInputChange)
  matchCountInput.addEventListener('input', handleMatchCountChange)

  // Initial render of content area
  render()
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
