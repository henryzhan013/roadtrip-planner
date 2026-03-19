import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { DayPlan, DayWeather, WeatherResponse } from '../types';

interface WeatherLocation {
  lat: number;
  lng: number;
  date: string;
}

export function useWeather() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherForTrip = useCallback(
    async (tripDays: DayPlan[], startDate: Date): Promise<DayWeather[]> => {
      setLoading(true);
      setError(null);

      try {
        // Get one representative location per day (first place with coordinates)
        const locations: WeatherLocation[] = tripDays
          .map((day, index) => {
            const placeWithCoords = day.activities.find(act => act.place?.lat && act.place?.lng);
            if (!placeWithCoords?.place) return null;

            const date = new Date(startDate);
            date.setDate(date.getDate() + index);

            return {
              lat: placeWithCoords.place.lat,
              lng: placeWithCoords.place.lng,
              date: date.toISOString().split('T')[0],
            };
          })
          .filter((loc): loc is WeatherLocation => loc !== null);

        if (locations.length === 0) {
          setLoading(false);
          return [];
        }

        const response = await api.post<WeatherResponse>('/weather', { locations });
        setLoading(false);
        return response.forecasts;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch weather';
        setError(message);
        setLoading(false);
        return [];
      }
    },
    []
  );

  const getWeatherForDay = useCallback(
    async (lat: number, lng: number, date: string): Promise<DayWeather | null> => {
      try {
        const response = await api.post<WeatherResponse>('/weather', {
          locations: [{ lat, lng, date }],
        });
        return response.forecasts[0] || null;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    loading,
    error,
    fetchWeatherForTrip,
    getWeatherForDay,
  };
}
