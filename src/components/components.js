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

function renderBestOfBadges(restaurant) {
  const years = [2025, 2024, 2023, 2022, 2021];
  const badges = years
    .filter(year => restaurant[`best_of_${year}`])
    .map(year => `
      <span class="badge best-of-badge" title="Best of ${year}" style="display: inline-flex; align-items: center; background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; border: 1px solid #ffeeba;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffc107" stroke="#ffc107" stroke-width="2" style="margin-right: 4px;">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        Best of ${year}
      </span>
    `)
    .join('');
  
  return badges ? `<div class="badges-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; margin-bottom: 8px;">${badges}</div>` : '';
}

// Review Card Subcomponent for Detail View
export function renderReviewCard(review) {
  const { title, short_review, link } = review
  const decodedTitle = decodeHTMLEntities(title)

  return `
    <div class="review-card">
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

// Restaurant Card Component
export function renderRestaurantCard(result) {
  const {
    id,
    name,
    address,
    location,
    description,
    similarity
  } = result

  const displayLocation = address || location || ''

  // Make the entire card clickable
  return `
    <div class="restaurant-card" onclick="window.selectRestaurant('${id}')" style="cursor: pointer;">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
        <h3 class="restaurant-name" style="margin: 0;">
          ${name || 'Unknown Restaurant'}
        </h3>
        ${similarity != null ? `<span class="similarity-badge" title="AI Match Score" style="font-size: 0.75rem; background: #f0f9ff; color: #0369a1; padding: 4px 8px; border-radius: 12px; border: 1px solid #bae6fd; white-space: nowrap; font-weight: bold;">${(similarity * 100).toFixed(1)}% Match</span>` : ''}
      </div>
      
      ${renderBestOfBadges(result)}

      ${displayLocation ? `
        <div class="location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${displayLocation}</span>
        </div>
      ` : ''}

      ${description ? `
        <p class="restaurant-description">
          ${description.length > 300 ? `${description.substring(0, 300)}...` : description}
        </p>
      ` : ''}
      <div class="card-action">
        <button class="view-details-btn">View Reviews</button>
      </div>
    </div>
  `
}

// Restaurant Details Component
export function renderRestaurantDetails(restaurant) {
  const { name, address, location, description, keywords, reviews, similarity } = restaurant
  const displayLocation = address || location || ''
  const tagList = Array.isArray(keywords) ? keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('') : ''

  return `
    <div class="restaurant-details">
      <button class="back-button" onclick="window.backToSearch()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Search Results
      </button>

      <div class="details-header">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <h2 style="margin: 0;">${name || 'Unknown Restaurant'}</h2>
          ${similarity != null ? `<span class="similarity-badge" title="AI Match Score" style="font-size: 0.85rem; background: #f0f9ff; color: #0369a1; padding: 4px 10px; border-radius: 12px; border: 1px solid #bae6fd; font-weight: bold;">${(similarity * 100).toFixed(1)}% Match</span>` : ''}
        </div>
        ${renderBestOfBadges(restaurant)}
        ${displayLocation ? `
          <div class="location">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${displayLocation}</span>
          </div>
        ` : ''}
      </div>

      ${tagList ? `<div class="keywords-container">${tagList}</div>` : ''}

      ${description ? `
        <div class="restaurant-description full">
          <p>${description}</p>
        </div>
      ` : ''}

      <div class="restaurant-reviews-section">
        <h3>Relevant Reviews (${reviews ? reviews.length : 0})</h3>
        <div class="reviews-list">
          ${reviews && reviews.length > 0 
            ? reviews.map(r => renderReviewCard(r)).join('') 
            : '<p>No reviews available.</p>'}
        </div>
      </div>
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
