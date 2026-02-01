import { useState } from 'react';
import SearchBar from './components/SearchBar';
import ResultsList from './components/ResultsList';
import Map from './components/Map';
import PlaceDetail from './components/PlaceDetail';
import { searchPlaces, getPlaceDetails } from './api';
import './index.css';

/**
 * Main App component.
 *
 * State:
 * - results: array of search results from /search endpoint
 * - selectedId: currently selected place_id (for highlighting)
 * - detailPlace: full place details for the modal (from /places/{id})
 * - isSearching: loading state for search
 * - isLoadingDetail: loading state for place details
 * - error: error message to display
 */
export default function App() {
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detailPlace, setDetailPlace] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  // Handle search submission
  const handleSearch = async (query) => {
    setIsSearching(true);
    setError(null);
    setLastQuery(query);

    try {
      const data = await searchPlaces(query, 10);
      setResults(data.results);
      setSelectedId(null);
      setDetailPlace(null);
    } catch (err) {
      setError('Failed to search. Is the backend running?');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle place selection (from list or map)
  const handleSelect = async (placeId) => {
    setSelectedId(placeId);

    // Load full details for the modal
    setIsLoadingDetail(true);
    try {
      const details = await getPlaceDetails(placeId);
      setDetailPlace(details);
    } catch (err) {
      console.error('Failed to load place details:', err);
      // Still keep it selected, just won't show modal
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setDetailPlace(null);
  };

  // Extract just the place objects for the map
  const places = results.map((r) => r.place);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Road Trip Planner
            <span className="text-amber-600 ml-2 text-lg font-normal">
              Find your vibe
            </span>
          </h1>
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Search info */}
          {lastQuery && results.length > 0 && (
            <p className="mt-3 text-gray-600">
              Found {results.length} places matching "{lastQuery}"
            </p>
          )}
        </div>
      </header>

      {/* Main content: Results + Map side by side */}
      <main className="flex-1 flex overflow-hidden">
        {/* Results panel */}
        <div className="w-96 bg-gray-50 border-r p-4 overflow-hidden flex flex-col">
          <h2 className="font-semibold text-gray-700 mb-3">Results</h2>
          <div className="flex-1 overflow-hidden">
            <ResultsList
              results={results}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 p-4">
          <div className="h-full rounded-lg overflow-hidden shadow-lg">
            <Map
              places={places}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </main>

      {/* Place detail modal */}
      <PlaceDetail
        place={detailPlace}
        onClose={handleCloseDetail}
        isLoading={isLoadingDetail}
      />
    </div>
  );
}
