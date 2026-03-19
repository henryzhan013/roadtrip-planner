import { useCallback } from 'react';
import { api } from '../utils/api';
import { useAppContext } from '../context/AppContext';
import type { Place } from '../types';

export function useFavorites() {
  const { syncCode, favorites, setFavorites, addFavorite, removeFavorite } = useAppContext();

  const loadFavorites = useCallback(async () => {
    if (!syncCode) return;

    try {
      const data = await api.get<{ favorites: Array<{ place_id: string }> }>(`/favorites/${syncCode}`);
      setFavorites(data.favorites.map(f => f.place_id));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, [syncCode, setFavorites]);

  const toggleFavorite = useCallback(
    async (placeId: string, placeData?: Place): Promise<boolean> => {
      if (!syncCode) return false;

      const isFavorite = favorites.includes(placeId);

      try {
        if (isFavorite) {
          await api.delete(`/favorites/${syncCode}/${placeId}`);
          removeFavorite(placeId);
        } else if (placeData) {
          await api.post(`/favorites/${syncCode}`, {
            place_id: placeId,
            name: placeData.name,
            address: placeData.address,
            lat: placeData.lat,
            lng: placeData.lng,
            rating: placeData.rating,
            category: placeData.category,
            photo_url: placeData.photo_url,
          });
          addFavorite(placeId);
        }
        return true;
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
        return false;
      }
    },
    [syncCode, favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (placeId: string): boolean => {
      return favorites.includes(placeId);
    },
    [favorites]
  );

  return {
    favorites,
    loadFavorites,
    toggleFavorite,
    isFavorite,
  };
}
