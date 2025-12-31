import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { SearchResults } from './components/SearchResults'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { useRestaurantSearch } from './hooks/useRestaurantSearch'
import './styles/App.css'

function App() {
  const [searchOptions, setSearchOptions] = useState({
    matchCount: 10
  })

  const {
    results,
    loading,
    error,
    searchQuery,
    performSearch,
    clearSearch
  } = useRestaurantSearch()

  const handleSearch = async (query) => {
    await performSearch(query, searchOptions)
  }

  const handleRetry = () => {
    if (searchQuery) {
      handleSearch(searchQuery)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Maine Restaurant Search</h1>
        <p className="subtitle">Currently serving Portland Maine restaurants</p>
      </header>

      <main className="app-main">
        <SearchBar
          onSearch={handleSearch}
          loading={loading}
          onClear={clearSearch}
        />

        {/* Advanced options */}
        <details className="search-options">
          <summary>Advanced Options</summary>
          <div className="options-content">
            <label>
              <span>Max Results: {searchOptions.matchCount}</span>
              <input
                type="number"
                min="1"
                max="50"
                value={searchOptions.matchCount}
                onChange={(e) => setSearchOptions(prev => ({
                  ...prev,
                  matchCount: parseInt(e.target.value) || 10
                }))}
                disabled={loading}
              />
            </label>
          </div>
        </details>

        {/* Conditional rendering based on state */}
        {loading && <LoadingSpinner message="Finding restaurants..." />}

        {error && !loading && (
          <ErrorMessage error={error} onRetry={handleRetry} />
        )}

        {!loading && !error && searchQuery && (
          <SearchResults results={results} searchQuery={searchQuery} />
        )}

        {!loading && !error && !searchQuery && (
          <div className="welcome-message">
            <h2>Welcome to Maine Restaurant Search</h2>
            <p>Search for restaurants using natural language queries</p>
            <div className="example-queries">
              <h3>Example searches:</h3>
              <ul>
                <li>"Best seafood restaurants in Portland"</li>
                <li>"Cozy Italian places with outdoor seating"</li>
                <li>"Family-friendly restaurants near the waterfront"</li>
                <li>"Romantic dinner spots in downtown"</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>:)</p>
      </footer>
    </div>
  )
}

export default App
