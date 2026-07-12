import { getState, clearState } from './state.js';
import { generateEmbedding } from './services/embeddingService.js';
import { hybridSearchRestaurants } from './services/searchService.js';
import { renderLoadingSpinner, renderErrorMessage, renderSearchResults } from './components/components.js';
import badWordsRaw from '../bad_en.txt?raw';

// Pre-compile bad words regexes for performance
const badWordsRegexes = badWordsRaw
  .split('\n')
  .map(w => w.trim())
  .filter(w => w.length > 0)
  .map(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i')
  });

const state = {
  results: [],
  loading: false,
  error: null,
  searchQuery: '',
  matchCount: 5
};

let contentArea;

function compileQuery() {
  const wizard = getState();
  const parts = [];
  if (wizard.cuisine && wizard.cuisine !== 'Any') parts.push(wizard.cuisine + ' cuisine');
  if (wizard.foodTruck === 'Yes') parts.push('food truck');
  else if (wizard.foodTruck === 'No') parts.push('sit-down restaurant');
  if (wizard.seasonal === 'Year-round only') parts.push('year-round');
  if (wizard.vibe && wizard.vibe !== 'Does not matter') parts.push(wizard.vibe + ' atmosphere');
  if (wizard.features && wizard.features.length > 0) parts.push(wizard.features.join(' '));

  return parts.join(' ') || 'best restaurants';
}

function render() {
  if (state.loading) {
    contentArea.innerHTML = renderLoadingSpinner();
  } else if (state.error) {
    contentArea.innerHTML = renderErrorMessage(state.error, true);
  } else {
    contentArea.innerHTML = renderSearchResults(state.results, state.searchQuery, false);
  }
}

async function performSearch(query) {
  state.error = null;
  state.loading = true;
  state.searchQuery = query;
  render();

  // Profanity check
  const isProfane = badWordsRegexes.some(regex => regex.test(query));
  if (isProfane) {
    state.results = [];
    state.loading = false;
    render();
    return;
  }

  try {
    const embedding = await generateEmbedding(query);
    const searchResults = await hybridSearchRestaurants(query, embedding, 0.75, state.matchCount);

    const getStableHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    const jitterAmount = 0.02;
    const jitteredResults = [...searchResults].sort((a, b) => {
      const hashA = getStableHash((a.id || '') + query);
      const hashB = getStableHash((b.id || '') + query);
      const randomA = (Math.abs(hashA) % 10000) / 10000 * 2 - 1;
      const randomB = (Math.abs(hashB) % 10000) / 10000 * 2 - 1;
      return (b.similarity + (randomB * jitterAmount)) - (a.similarity + (randomA * jitterAmount));
    });

    // Store in session storage so result.html can access the selected one
    sessionStorage.setItem('last_search_results', JSON.stringify(jitteredResults));
    
    state.results = jitteredResults;
    state.loading = false;
    render();
  } catch (err) {
    state.error = err.message || 'An unexpected error occurred during search';
    state.loading = false;
    render();
  }
}

window.loadMoreSuggestions = () => {
  state.matchCount += 5;
  if (state.searchQuery) {
    performSearch(state.searchQuery);
  }
};

window.resetSearch = () => {
  clearState();
  window.location.href = '/';
};

window.selectRestaurant = (id) => {
  window.location.href = `/result.html?id=${id}`;
};

document.addEventListener('DOMContentLoaded', () => {
  contentArea = document.getElementById('content-area');
  
  // Clean up any stray UI details since we handle display here
  const adv = document.getElementById('advanced-options');
  if(adv) adv.style.display = 'none';
  const wiz = document.getElementById('wizard-container');
  if(wiz) wiz.style.display = 'none';
  
  const query = compileQuery();
  performSearch(query);
});
