import { useCallback } from 'react';
import { api } from '../utils/api';
import { useAppContext } from '../context/AppContext';
import type { Trip, DayPlan } from '../types';

interface SaveTripParams {
  tripId: string;
  query: string;
  summary: string;
  days: DayPlan[];
}

interface UpdateTripParams {
  query?: string;
  summary?: string;
  days?: DayPlan[];
}

export function useTrips() {
  const { syncCode, savedTrips, setSavedTrips, addSavedTrip, removeSavedTrip, updateSavedTrip, showToast } = useAppContext();

  const loadTrips = useCallback(async () => {
    if (!syncCode) return;

    try {
      const data = await api.get<{ trips: Trip[] }>(`/trips/${syncCode}`);
      setSavedTrips(data.trips);
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  }, [syncCode, setSavedTrips]);

  const saveTrip = useCallback(
    async (params: SaveTripParams): Promise<boolean> => {
      if (!syncCode) return false;

      try {
        await api.post(`/trips/${syncCode}`, {
          trip_id: params.tripId,
          query: params.query,
          summary: params.summary,
          days: params.days,
        });

        const trip: Trip = {
          id: params.tripId,
          query: params.query,
          summary: params.summary,
          days: params.days,
          savedAt: new Date().toISOString(),
        };

        addSavedTrip(trip);
        showToast('Trip saved!');
        return true;
      } catch (err) {
        console.error('Failed to save trip:', err);
        showToast('Failed to save trip', 'error');
        return false;
      }
    },
    [syncCode, addSavedTrip, showToast]
  );

  const updateTrip = useCallback(
    async (tripId: string, updates: UpdateTripParams): Promise<boolean> => {
      if (!syncCode) return false;

      try {
        await api.patch(`/trips/${syncCode}/${tripId}`, updates);
        updateSavedTrip(tripId, updates as Partial<Trip>);
        showToast('Changes saved!');
        return true;
      } catch (err) {
        console.error('Failed to update trip:', err);
        showToast('Failed to save changes', 'error');
        return false;
      }
    },
    [syncCode, updateSavedTrip, showToast]
  );

  const deleteTrip = useCallback(
    async (tripId: string): Promise<boolean> => {
      if (!syncCode) return false;

      try {
        await api.delete(`/trips/${syncCode}/${tripId}`);
        removeSavedTrip(tripId);
        return true;
      } catch (err) {
        console.error('Failed to delete trip:', err);
        return false;
      }
    },
    [syncCode, removeSavedTrip]
  );

  return {
    trips: savedTrips,
    loadTrips,
    saveTrip,
    updateTrip,
    deleteTrip,
  };
}
