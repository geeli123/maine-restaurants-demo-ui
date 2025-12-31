import { MapPin, Star, ExternalLink } from 'lucide-react'

export function RestaurantCard({ result }) {
  const {
    restaurant_name,
    address,
    location,
    title,
    short_review,
    link,
  } = result

  return (
    <div className="restaurant-card">
      <div className="card-header">
        <h3 className="restaurant-name">
          {restaurant_name || 'Unknown Restaurant'}
        </h3>
      </div>

      {address && (
        <div className="location">
          <MapPin size={16} />
          <span>{address}</span>
        </div>
      )}

      {!address && location && (
        <div className="location">
          <MapPin size={16} />
          <span>{location}</span>
        </div>
      )}

      <h4 className="review-title"><a href={link} target="_blank">{title}</a></h4>

      {short_review && (
        <p className="review-content">
          {short_review.length > 300
            ? `${short_review.substring(0, 300)}...`
            : short_review}
        </p>
      )}
    </div>
  )
}
