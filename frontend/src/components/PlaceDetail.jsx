/**
 * Detailed view of a single place (modal/panel).
 *
 * Props:
 * - place: full place object with reviews, description, etc.
 * - onClose: function - called when user closes the detail view
 * - isLoading: boolean
 */
export default function PlaceDetail({ place, onClose, isLoading }) {
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!place) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{place.name}</h2>
            <p className="text-gray-600 mt-1">{place.address}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Rating & Info */}
          <div className="flex flex-wrap gap-4">
            {place.rating && (
              <div className="flex items-center gap-2">
                <span className="text-2xl text-amber-500">★</span>
                <span className="text-xl font-semibold">{place.rating}</span>
                <span className="text-gray-500">
                  ({place.rating_count?.toLocaleString()} reviews)
                </span>
              </div>
            )}
            {place.business_status && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium
                              ${place.business_status === 'OPERATIONAL'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                              }`}>
                {place.business_status === 'OPERATIONAL' ? 'Open' : place.business_status}
              </span>
            )}
          </div>

          {/* Description */}
          {place.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-gray-700">{place.description}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex items-center gap-2 text-amber-700 hover:text-amber-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {place.phone}
              </a>
            )}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            )}
          </div>

          {/* Reviews */}
          {place.reviews && place.reviews.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Reviews ({place.reviews.length})
              </h3>
              <div className="space-y-3">
                {place.reviews.slice(0, 3).map((review, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      "{review.length > 300 ? review.slice(0, 300) + '...' : review}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
