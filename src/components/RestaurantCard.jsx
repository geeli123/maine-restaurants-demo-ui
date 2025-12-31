import { MapPin, Star, ExternalLink } from 'lucide-react'

export function RestaurantCard({ result }) {
  const {
    restaurant_name,
    location,
    title,
    content,
    link,
    overall_score,
    similarity
  } = result

  // Format similarity as percentage
  const similarityPercent = (similarity * 100).toFixed(1)

  return (
    <div className="restaurant-card">
      <div className="card-header">
        <h3 className="restaurant-name">
          {restaurant_name || 'Unknown Restaurant'}
        </h3>
        <div className="similarity-badge">
          {similarityPercent}% match
        </div>
      </div>

      {location && (
        <div className="location">
          <MapPin size={16} />
          <span>{location}</span>
        </div>
      )}

      {overall_score && overall_score > 0 && (
        <div className="rating">
          <Star size={16} fill="currentColor" />
          <span>{overall_score}/10</span>
        </div>
      )}

      <h4 className="review-title">{title}</h4>

      {content && (
        <p className="review-content">
          {content.length > 300
            ? `${content.substring(0, 300)}...`
            : content}
        </p>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="read-more-link"
        >
          Read full review <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}
