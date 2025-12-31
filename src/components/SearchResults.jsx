import { RestaurantCard } from './RestaurantCard'

export function SearchResults({ results, searchQuery }) {
  if (results.length === 0) {
    return (
      <div className="no-results">
        <p>No restaurants found for "{searchQuery}"</p>
        <p className="hint">Try adjusting your search terms or being more specific</p>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <h2>
          Found {results.length} restaurant{results.length !== 1 ? 's' : ''}
        </h2>
        <p className="search-query">Search: "{searchQuery}"</p>
      </div>
      <div className="results-grid">
        {results.map((result) => (
          <RestaurantCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  )
}
