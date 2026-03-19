import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity, Place } from '../../types';
import { ACTIVITY_ICONS, PRICE_LABELS } from '../../utils/constants';

interface ActivityCardProps {
  activity: Activity;
  activityId: string;
  isFavorite: boolean;
  onToggleFavorite: (placeId: string, place: Place) => void;
  onRemove: () => void;
  onSelect: (data: { place: Place }) => void;
}

function getPlaceLinks(place: Place) {
  const encodedName = encodeURIComponent(place.name);
  const encodedAddress = encodeURIComponent(place.address || '');

  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedName}+${encodedAddress}&query_place_id=${place.place_id}`,
    googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodedName}+${encodedAddress}&destination_place_id=${place.place_id}`,
    bookGoogle: `https://www.google.com/search?q=${encodedName}+${encodedAddress}+reservations+booking`,
  };
}

export function ActivityCard({
  activity,
  activityId,
  isFavorite,
  onToggleFavorite,
  onRemove,
  onSelect,
}: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activityId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto' as const,
  };

  const hasPlace = !!activity.place;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`activity-card ${hasPlace ? 'with-place' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => hasPlace && activity.place && onSelect({ place: activity.place })}
    >
      {/* Drag Handle */}
      <div className="drag-handle" {...attributes} {...listeners}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="10" cy="12" r="1.5" />
        </svg>
      </div>

      {/* Time Slot Label */}
      {activity.time_slot && (
        <div className="activity-time-slot">
          <span className="time-icon">{ACTIVITY_ICONS[activity.activity_type] || '📍'}</span>
          <span className="time-label">{activity.time_slot}</span>
        </div>
      )}

      {/* Photo */}
      {activity.place?.photo_url && (
        <img src={activity.place.photo_url} alt={activity.place.name} className="activity-photo" />
      )}

      {/* Content */}
      <div className="activity-content">
        {hasPlace && activity.place ? (
          <>
            <div className="activity-name">{activity.place.name}</div>
            <div className="activity-desc">{activity.description}</div>
            <div className="activity-meta">
              <span>📍 {activity.place.address}</span>
              {activity.place.rating && <span>⭐ {activity.place.rating}</span>}
              {activity.place.price_level && (
                <span style={{ color: 'var(--secondary)' }}>
                  {PRICE_LABELS[activity.place.price_level]}
                </span>
              )}
            </div>
            {/* Booking & Map Links */}
            <div className="link-pills">
              <a
                href={getPlaceLinks(activity.place).googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="link-pill link-pill-blue"
              >
                📍 Map
              </a>
              <a
                href={getPlaceLinks(activity.place).googleDirections}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="link-pill link-pill-blue"
              >
                🚗 Directions
              </a>
              {(activity.activity_type === 'food' || activity.activity_type === 'hotel') && (
                <a
                  href={getPlaceLinks(activity.place).bookGoogle}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="link-pill link-pill-green"
                >
                  📅 Book
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="activity-simple">
            {activity.description}
          </div>
        )}
      </div>

      {/* Actions - shown on hover */}
      <div className="activity-actions">
        {hasPlace && activity.place && (
          <button
            className={`action-btn favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(activity.place!.place_id, activity.place!);
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="action-btn delete-btn"
          title="Remove stop"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
