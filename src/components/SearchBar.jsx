import { useState } from 'react'
import { Search, X } from 'lucide-react'

export function SearchBar({ onSearch, loading, onClear }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for restaurants... (e.g., 'best seafood in Portland')"
          className="search-input"
          disabled={loading}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            aria-label="Clear search"
            disabled={loading}
          >
            <X size={20} />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="search-button"
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}
