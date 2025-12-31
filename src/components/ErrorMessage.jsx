import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="error-message">
      <AlertCircle size={24} />
      <h3>Search Error</h3>
      <p>{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  )
}
