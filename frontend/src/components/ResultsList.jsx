import PlaceCard from './PlaceCard';

/**
 * List of search results.
 *
 * Props:
 * - results: array of {place, score, score_percentage}
 * - selectedId: string - currently selected place_id
 * - onSelect: function(placeId) - called when a place is clicked
 */
export default function ResultsList({ results, selectedId, onSelect }) {
  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Search for a vibe to see results</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto results-list pr-2">
      {results.map((result, index) => (
        <PlaceCard
          key={result.place.place_id}
          place={result.place}
          score={result.score}
          scorePercentage={result.score_percentage}
          isSelected={result.place.place_id === selectedId}
          onClick={() => onSelect(result.place.place_id)}
        />
      ))}
    </div>
  );
}
