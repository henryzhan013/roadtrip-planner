import type { Place } from '../../types';

interface PlaceCardProps {
  place: Place;
  rank: number;
  isFavorite: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
}

export function PlaceCard({ place, rank, isFavorite, onClick, onToggleFavorite }: PlaceCardProps) {
  return (
    <div
      className="card card-elevated"
      style={{
        padding: '16px',
        margin: '12px 0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
      onClick={onClick}
    >
      <span
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--primary)',
          minWidth: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--primary-bg)',
          borderRadius: 'var(--radius)',
        }}
      >
        {rank}
      </span>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--gray-800)' }}>
          {place.name}
        </h3>
        {place.rating && (
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '14px' }}>
            ⭐ {place.rating}
          </p>
        )}
        {place.why && (
          <p style={{ margin: '6px 0 0 0', color: 'var(--gray-400)', fontSize: '13px' }}>
            💡 {place.why}
          </p>
        )}
      </div>
      <button
        className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
  );
}
