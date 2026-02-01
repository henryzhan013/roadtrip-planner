/**
 * A single place result card.
 *
 * Props:
 * - place: object with name, address, rating, rating_count, category
 * - score: number (0-1) - match score from search
 * - scorePercentage: string (e.g., "87.3%")
 * - isSelected: boolean - highlights the card
 * - onClick: function - called when card is clicked
 */
export default function PlaceCard({ place, score, scorePercentage, isSelected, onClick }) {
  // Extract city/state from full address
  const location = place.address
    ? place.address.split(', ').slice(-3, -1).join(', ')
    : 'Unknown location';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer transition-all border-2
                  ${isSelected
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-transparent bg-white hover:bg-gray-50 shadow'
                  }`}
    >
      {/* Header: Name + Score */}
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight">
          {place.name}
        </h3>
        {scorePercentage && (
          <span className={`px-2 py-1 text-sm font-medium rounded-full whitespace-nowrap
                          ${score > 0.5
                            ? 'bg-green-100 text-green-800'
                            : score > 0.3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
            {scorePercentage} match
          </span>
        )}
      </div>

      {/* Location */}
      <p className="mt-1 text-gray-600 text-sm">
        {location}
      </p>

      {/* Rating + Category */}
      <div className="mt-2 flex items-center gap-3 text-sm">
        {place.rating && (
          <span className="flex items-center gap-1">
            <span className="text-amber-500">★</span>
            <span className="font-medium">{place.rating}</span>
            <span className="text-gray-400">
              ({place.rating_count?.toLocaleString()} reviews)
            </span>
          </span>
        )}
        {place.category && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {place.category.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}
