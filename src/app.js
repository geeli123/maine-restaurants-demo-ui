// Main application logic
import { generateEmbedding } from './services/embeddingService.js'
import { searchRestaurants, hybridSearchRestaurants } from './services/searchService.js'
import {
  renderLoadingSpinner,
  renderErrorMessage,
  renderSearchResults,
  renderRestaurantDetails
} from './components/components.js'
import badWordsRaw from '../bad_en.txt?raw'

// Pre-compile bad words regexes for performance
const badWordsRegexes = badWordsRaw
  .split('\n')
  .map(w => w.trim())
  .filter(w => w.length > 0)
  .map(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i')
  })

// Application state
const state = {
  results: [],
  loading: false,
  loadingMore: false,
  error: null,
  searchQuery: '', // The compiled string for display
  matchCount: 5,
  selectedRestaurant: null,
  wizard: {
    step: 1,
    cuisine: '',
    foodTruck: '',
    seasonal: '',
    vibe: '',
    features: []
  }
}

// DOM element references
let matchCountInput, matchCountDisplay, contentArea, wizardContainer

// Render the entire app structure
function renderApp() {
  const root = document.getElementById('root')

  root.innerHTML = `
    <div class="app">
      <header class="app-header">
        <h1>Maine Menu Match</h1>
        <p class="subtitle">Currently serving Portland Maine</p>
      </header>

      <main class="app-main">
        <!-- Wizard UI -->
        <div id="wizard-container" class="wizard-container"></div>

        <!-- Advanced Options -->
        <details class="search-options" id="advanced-options">
          <summary>Advanced Options</summary>
          <div class="options-content">
            <label>
              <span>Max Results: <span id="match-count-display">5</span></span>
              <input
                type="number"
                id="match-count"
                min="1"
                max="50"
                value="5"
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

  matchCountInput = document.getElementById('match-count')
  matchCountDisplay = document.getElementById('match-count-display')
  contentArea = document.getElementById('content-area')
  wizardContainer = document.getElementById('wizard-container')
}

const CUISINES = ['Seafood', 'Italian', 'American', 'Pub Food', 'Asian', 'Mexican', 'Bakery/Cafe', 'Other', 'Any']
const VIBES = ['Cozy', 'Romantic', 'Lively', 'Upscale', 'Divey', 'Casual', 'Trendy', 'Does not matter']
const FEATURES = ['Budget', 'Special Occasion', 'Kid-Friendly', 'Gluten-Free Options', 'Pet-Friendly', 'Vegan or Vegetarian', 'Outdoor or Patio Seating']

function renderWizard() {
  if (state.selectedRestaurant || state.results.length > 0 || state.loading || state.error) {
    wizardContainer.style.display = 'none'
    document.getElementById('advanced-options').style.display = 'none'
    return
  }

  wizardContainer.style.display = 'block'
  document.getElementById('advanced-options').style.display = 'block'

  let html = `<div class="wizard-step">`

  if (state.wizard.step === 1) {
    html += `
      <h2>Step 1: What kind of cuisine are you in the mood for?</h2>
      <div class="options-grid">
        ${CUISINES.map(c => `
          <label class="wizard-option ${state.wizard.cuisine === c ? 'selected' : ''}">
            <input type="radio" name="cuisine" value="${c}" ${state.wizard.cuisine === c ? 'checked' : ''} onchange="window.handleWizardChange('cuisine', '${c}')">
            ${c}
          </label>
        `).join('')}
      </div>
      <div class="wizard-actions">
        <button class="wizard-btn next-btn" onclick="window.nextWizardStep()" ${!state.wizard.cuisine ? 'disabled' : ''}>Next</button>
      </div>
    `
  } else if (state.wizard.step === 2) {
    html += `
      <h2>Step 2: Let's narrow down the type of place</h2>
      
      <div class="wizard-question">
        <h3>Do you want to include food trucks?</h3>
        <div class="options-row">
          ${['Yes', 'No', 'Does not matter'].map(o => `
            <label class="wizard-option ${state.wizard.foodTruck === o ? 'selected' : ''}">
              <input type="radio" name="foodTruck" value="${o}" ${state.wizard.foodTruck === o ? 'checked' : ''} onchange="window.handleWizardChange('foodTruck', '${o}')">
              ${o}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="wizard-question">
        <h3>Are seasonal restaurants OK?</h3>
        <div class="options-row">
          ${['Year-round only', 'Seasonal OK', 'Does not matter'].map(o => `
            <label class="wizard-option ${state.wizard.seasonal === o ? 'selected' : ''}">
              <input type="radio" name="seasonal" value="${o}" ${state.wizard.seasonal === o ? 'checked' : ''} onchange="window.handleWizardChange('seasonal', '${o}')">
              ${o}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="wizard-actions">
        <button class="wizard-btn back-btn" onclick="window.prevWizardStep()">Back</button>
        <button class="wizard-btn next-btn" onclick="window.nextWizardStep()" ${(!state.wizard.foodTruck || !state.wizard.seasonal) ? 'disabled' : ''}>Next</button>
      </div>
    `
  } else if (state.wizard.step === 3) {
    html += `
      <h2>Step 3: What kind of vibe are you looking for?</h2>
      <div class="options-grid">
        ${VIBES.map(v => `
          <label class="wizard-option ${state.wizard.vibe === v ? 'selected' : ''}">
            <input type="radio" name="vibe" value="${v}" ${state.wizard.vibe === v ? 'checked' : ''} onchange="window.handleWizardChange('vibe', '${v}')">
            ${v}
          </label>
        `).join('')}
      </div>
      <div class="wizard-actions">
        <button class="wizard-btn back-btn" onclick="window.prevWizardStep()">Back</button>
        <button class="wizard-btn next-btn" onclick="window.nextWizardStep()" ${!state.wizard.vibe ? 'disabled' : ''}>Next</button>
      </div>
    `
  } else if (state.wizard.step === 4) {
    html += `
      <h2>Step 4: Any special requirements? (Select all that apply)</h2>
      <div class="options-grid checkboxes">
        ${FEATURES.map(f => `
          <label class="wizard-option ${state.wizard.features.includes(f) ? 'selected' : ''}">
            <input type="checkbox" value="${f}" ${state.wizard.features.includes(f) ? 'checked' : ''} onchange="window.handleWizardFeatureToggle('${f}')">
            ${f}
          </label>
        `).join('')}
      </div>
      <div class="wizard-actions">
        <button class="wizard-btn back-btn" onclick="window.prevWizardStep()">Back</button>
        <button class="wizard-btn search-btn" onclick="window.submitWizard()">Search Restaurants</button>
      </div>
    `
  }

  html += `</div>`
  wizardContainer.innerHTML = html
}

// Global wizard handlers
window.handleWizardChange = (field, value) => {
  state.wizard[field] = value
  render()
}

window.handleWizardFeatureToggle = (feature) => {
  const idx = state.wizard.features.indexOf(feature)
  if (idx === -1) {
    state.wizard.features.push(feature)
  } else {
    state.wizard.features.splice(idx, 1)
  }
  render()
}

window.nextWizardStep = () => {
  state.wizard.step = Math.min(4, state.wizard.step + 1)
  render()
}

window.prevWizardStep = () => {
  state.wizard.step = Math.max(1, state.wizard.step - 1)
  render()
}

window.submitWizard = () => {
  // Compile query
  const parts = []
  if (state.wizard.cuisine && state.wizard.cuisine !== 'Any') {
    parts.push(state.wizard.cuisine + ' cuisine')
  }
  if (state.wizard.foodTruck === 'Yes') {
    parts.push('food truck')
  } else if (state.wizard.foodTruck === 'No') {
    parts.push('sit-down restaurant')
  }
  if (state.wizard.seasonal === 'Year-round only') {
    parts.push('year-round')
  }
  if (state.wizard.vibe && state.wizard.vibe !== 'Does not matter') {
    parts.push(state.wizard.vibe + ' atmosphere')
  }
  if (state.wizard.features.length > 0) {
    parts.push(state.wizard.features.join(' '))
  }

  const query = parts.join(' ') || 'best restaurants'
  performSearch(query)
}

// Update UI based on state
function render() {
  if (state.selectedRestaurant) {
    wizardContainer.style.display = 'none'
    document.getElementById('advanced-options').style.display = 'none'
    contentArea.innerHTML = renderRestaurantDetails(state.selectedRestaurant)
  } else if (state.results.length > 0 || state.error || state.loading) {
    wizardContainer.style.display = 'none'
    document.getElementById('advanced-options').style.display = 'none'

    let content = `
      <div class="search-actions-bar" style="margin-bottom: 2rem;">
        <button class="wizard-btn back-btn" onclick="window.resetSearch()">Start New Search</button>
      </div>
    `

    if (state.loading) {
      content += renderLoadingSpinner()
    } else if (state.error && !state.loading) {
      content += renderErrorMessage(state.error, true)
    } else if (state.results.length > 0) {
      content += renderSearchResults(state.results, state.searchQuery, state.loadingMore)
    }
    contentArea.innerHTML = content
  } else {
    // Show wizard
    contentArea.innerHTML = ''
    renderWizard()
  }
}

window.resetSearch = () => {
  state.results = []
  state.error = null
  state.searchQuery = ''
  state.selectedRestaurant = null
  state.wizard = {
    step: 1,
    cuisine: '',
    foodTruck: '',
    seasonal: '',
    vibe: '',
    features: []
  }
  render()
}

window.loadMoreSuggestions = () => {
  state.matchCount += 5
  if (matchCountInput && matchCountDisplay) {
    matchCountInput.value = state.matchCount
    matchCountDisplay.textContent = state.matchCount
  }
  if (state.searchQuery) {
    performSearch(state.searchQuery, true)
  }
}

// Perform search
async function performSearch(query, isLoadMore = false) {
  state.error = null
  if (isLoadMore) {
    state.loadingMore = true
  } else {
    state.loading = true
    state.results = []
  }
  state.searchQuery = query
  render()

  // Profanity check
  const isProfane = badWordsRegexes.some(regex => regex.test(query))
  if (isProfane) {
    state.results = []
    state.loading = false
    state.loadingMore = false
    render()
    return []
  }

  try {
    const embedding = await generateEmbedding(query);
    const searchResults = await hybridSearchRestaurants(
      query,
      embedding,
      0.75,
      state.matchCount
    )

    // Add algorithmic jitter using a deterministic hash for stable sorting
    // so results aren't completely random on every load more
    const getStableHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    const jitterAmount = 0.02; // adjust this to control the amount of randomness
    const jitteredResults = [...searchResults].sort((a, b) => {
      const hashA = getStableHash((a.id || '') + query);
      const hashB = getStableHash((b.id || '') + query);
      const randomA = (Math.abs(hashA) % 10000) / 10000 * 2 - 1; // -1 to +1
      const randomB = (Math.abs(hashB) % 10000) / 10000 * 2 - 1;

      const scoreA = a.similarity + (randomA * jitterAmount);
      const scoreB = b.similarity + (randomB * jitterAmount);
      return scoreB - scoreA;
    });

    state.results = jitteredResults
    state.loading = false
    state.loadingMore = false
    render()
    return searchResults
  } catch (err) {
    const errorMessage = err.message || 'An unexpected error occurred during search'
    state.error = errorMessage
    state.results = []
    state.loading = false
    state.loadingMore = false
    console.error('Search failed:', err)
    render()
    return []
  }
}

function handleRetry() {
  if (state.searchQuery) {
    performSearch(state.searchQuery)
  }
}

function handleMatchCountChange() {
  state.matchCount = parseInt(matchCountInput.value) || 5
  matchCountDisplay.textContent = state.matchCount
}

// Initialize app
function init() {
  window.selectRestaurant = (id) => {
    const restaurant = state.results.find(r => r.id === id)
    if (restaurant) {
      state.selectedRestaurant = restaurant
      render()
    }
  }

  window.backToSearch = () => {
    state.selectedRestaurant = null
    render()
  }

  window.handleRetry = handleRetry

  // Render the entire app
  renderApp()

  // Add event listeners
  matchCountInput.addEventListener('input', handleMatchCountChange)

  // Initial render
  render()
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
