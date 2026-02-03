// Vanilla JS component functions

// Decode HTML entities in text
function decodeHTMLEntities(text) {
  if (!text) return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

// Loading Spinner Component
export function renderLoadingSpinner(message = 'Finding restaurants...') {
  return `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `
}

// Error Message Component
export function renderErrorMessage(error, onRetry) {
  return `
    <div class="error-message">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3>Search Error</h3>
      <p>${error}</p>
      ${onRetry ? '<button id="retry-button" class="retry-button">Try Again</button>' : ''}
    </div>
  `
}

// Restaurant Card Component
export function renderRestaurantCard(result) {
  const {
    restaurant_name,
    address,
    location,
    title,
    short_review,
    link,
  } = result

  const decodedTitle = decodeHTMLEntities(title)
  const displayLocation = address || location || ''

  return `
    <div class="restaurant-card">
      <div class="card-header">
        <h3 class="restaurant-name">
          ${restaurant_name || 'Unknown Restaurant'}
        </h3>
      </div>

      ${displayLocation ? `
        <div class="location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${displayLocation}</span>
        </div>
      ` : ''}

      <h4 class="review-title">
        <a href="${link}" target="_blank">${decodedTitle}</a>
      </h4>

      ${short_review ? `
        <p class="review-content">
          ${short_review.length > 300 ? `${short_review.substring(0, 300)}...` : short_review}
        </p>
      ` : ''}
    </div>
  `
}

// Search Results Component
export function renderSearchResults(results, searchQuery) {
  if (results.length === 0) {
    return `
      <div class="no-results">
        <p>No restaurants found for "${searchQuery}"</p>
        <p class="hint">Try adjusting your search terms or being more specific</p>
      </div>
    `
  }

  const resultsHTML = results.map(result => renderRestaurantCard(result)).join('')

  return `
    <div class="search-results">
      <div class="results-header">
        <h2>
          Found ${results.length} restaurant${results.length !== 1 ? 's' : ''}
        </h2>
        <p class="search-query">Search: "${searchQuery}"</p>
      </div>
      <div class="results-grid">
        ${resultsHTML}
      </div>
    </div>
  `
}

// Welcome Message Component
export function renderWelcomeMessage() {
  return `
    <div class="welcome-message">
      <h2>Welcome to Maine Restaurant Search</h2>
      <p>Restaurant Reviews that you can trust</p>
      <div class="example-queries">
        <h3>Example searches:</h3>
        <ul>
          <li>"Best seafood restaurants in Portland"</li>
          <li>"Cozy Italian places with outdoor seating"</li>
          <li>"Family-friendly restaurants near the waterfront"</li>
          <li>"Romantic dinner spots in downtown"</li>
        </ul>
      </div>
    </div>
  `
}
