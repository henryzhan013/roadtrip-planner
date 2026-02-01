import { useState } from 'react';

/**
 * Search bar component.
 *
 * Props:
 * - onSearch: function(query) - called when user submits a search
 * - isLoading: boolean - disables input while searching
 */
export default function SearchBar({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your vibe... (e.g., chill honky tonk with live music)"
          disabled={isLoading}
          className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 text-lg font-medium text-white bg-amber-600 rounded-lg
                     hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
