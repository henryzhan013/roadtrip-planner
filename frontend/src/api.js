/**
 * API client for the Road Trip Planner backend.
 *
 * All functions return promises. The base URL points to our FastAPI server.
 */

const API_BASE = 'http://localhost:8000';

/**
 * Search for places by vibe.
 * @param {string} query - The vibe description (e.g., "chill honky tonk")
 * @param {number} limit - Max results (default 5)
 * @returns {Promise<{query: string, results: Array}>}
 */
export async function searchPlaces(query, limit = 5) {
  const params = new URLSearchParams({ query, limit: limit.toString() });
  const response = await fetch(`${API_BASE}/search?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all places (for showing on map).
 * @returns {Promise<{total: number, places: Array}>}
 */
export async function getAllPlaces() {
  const response = await fetch(`${API_BASE}/places`);

  if (!response.ok) {
    throw new Error(`Failed to fetch places: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get full details for a single place.
 * @param {string} placeId - The Google place_id
 * @returns {Promise<Object>}
 */
export async function getPlaceDetails(placeId) {
  const response = await fetch(`${API_BASE}/places/${encodeURIComponent(placeId)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Place not found');
    }
    throw new Error(`Failed to fetch place: ${response.statusText}`);
  }

  return response.json();
}
