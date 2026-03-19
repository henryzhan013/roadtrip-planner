import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Trip, Toast } from '../types';

interface AppState {
  syncCode: string;
  favorites: string[];
  savedTrips: Trip[];
  darkMode: boolean;
  toasts: Toast[];
}

interface AppContextType extends AppState {
  setSyncCode: (code: string) => void;
  setFavorites: (favorites: string[]) => void;
  addFavorite: (placeId: string) => void;
  removeFavorite: (placeId: string) => void;
  setSavedTrips: (trips: Trip[]) => void;
  addSavedTrip: (trip: Trip) => void;
  removeSavedTrip: (tripId: string) => void;
  updateSavedTrip: (tripId: string, updates: Partial<Trip>) => void;
  toggleDarkMode: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [syncCode, setSyncCodeState] = useState(() => {
    return localStorage.getItem('syncCode') || '';
  });

  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const setSyncCode = useCallback((code: string) => {
    setSyncCodeState(code);
    if (code) {
      localStorage.setItem('syncCode', code);
    } else {
      localStorage.removeItem('syncCode');
    }
  }, []);

  const addFavorite = useCallback((placeId: string) => {
    setFavorites(prev => [...prev, placeId]);
  }, []);

  const removeFavorite = useCallback((placeId: string) => {
    setFavorites(prev => prev.filter(id => id !== placeId));
  }, []);

  const addSavedTrip = useCallback((trip: Trip) => {
    setSavedTrips(prev => [trip, ...prev]);
  }, []);

  const removeSavedTrip = useCallback((tripId: string) => {
    setSavedTrips(prev => prev.filter(t => t.id !== tripId));
  }, []);

  const updateSavedTrip = useCallback((tripId: string, updates: Partial<Trip>) => {
    setSavedTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, ...updates } : t))
    );
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <AppContext.Provider
      value={{
        syncCode,
        favorites,
        savedTrips,
        darkMode,
        toasts,
        setSyncCode,
        setFavorites,
        addFavorite,
        removeFavorite,
        setSavedTrips,
        addSavedTrip,
        removeSavedTrip,
        updateSavedTrip,
        toggleDarkMode,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
