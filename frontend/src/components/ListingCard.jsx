import { Link } from 'react-router-dom'
import { imageUrl } from '../api.js'
import { formatArea, formatDate, formatPrice } from '../utils.js'
import StatusBadge from './StatusBadge.jsx'

export default function ListingCard({ listing }) {
  return (
    <Link to={`/listings/${listing.id}`} className="card listing-card">
      <div className="card-img">
        {listing.thumbnail_id ? (
          <img src={imageUrl(listing.thumbnail_id)} alt={listing.title} loading="lazy" />
        ) : (
          <div className="no-img">Chưa có ảnh</div>
        )}
        <span className="chip chip-type">{listing.transaction_type}</span>
        {listing.status === 'deposited' && (
          <span className="chip chip-status"><StatusBadge status="deposited" /></span>
        )}
        {listing.image_ids.length > 1 && <span className="chip chip-count">🖼 {listing.image_ids.length}</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{listing.title}</h3>
        <div className="card-price">
          {formatPrice(listing.price, listing.transaction_type)}
          <span className="dot">·</span>
          <span className="muted">{formatArea(listing.area)}</span>
        </div>
        <div className="card-meta">
          <span>📍 {listing.district}, {listing.province}</span>
        </div>
        <div className="card-foot muted">
          <span>{listing.property_type}</span>
          <span>{formatDate(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
