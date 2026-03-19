import { useState, useEffect } from 'react';
import { TripProvider, useTripContext } from './context/TripContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { useTrips } from './hooks/useTrips';
import { useFavorites } from './hooks/useFavorites';
import { useBudget } from './hooks/useBudget';
import { useWeather } from './hooks/useWeather';
import { api } from './utils/api';
import { DayCard } from './components/trip/DayCard';
import { PlaceCard } from './components/trip/PlaceCard';
import { Map } from './components/map/Map';
import { BudgetTracker } from './components/budget/BudgetTracker';
import type { Place, DayPlan, Trip, Activity } from './types';
import 'leaflet/dist/leaflet.css';

// Generate simple ID for trips
const generateTripId = () => Math.random().toString(36).substring(2, 10);

// Skeleton Loading Component
function SkeletonLoader() {
  return (
    <div>
      {[1, 2].map(day => (
        <div key={day} className="skeleton-card">
          <div className="skeleton skeleton-header"></div>
          {[1, 2, 3].map(activity => (
            <div key={activity} className="skeleton-activity">
              <div className="skeleton skeleton-icon"></div>
              <div className="skeleton skeleton-photo"></div>
              <div className="skeleton-content">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text-short"></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Confetti Component
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    size: `${8 + Math.random() * 8}px`,
  }));

  return (
    <div className="confetti-container">
      {confettiPieces.map(piece => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            width: piece.size,
            height: piece.size,
          }}
        />
      ))}
    </div>
  );
}

// Toast Container
function ToastContainer() {
  const { toasts } = useAppContext();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '!'} {toast.message}
        </div>
      ))}
    </div>
  );
}

// Main App Content
function AppContent() {
  const { state, dispatch } = useTripContext();
  const { syncCode, setSyncCode, darkMode, toggleDarkMode, showToast, favorites } = useAppContext();
  const { trips, loadTrips, saveTrip, deleteTrip, updateTrip } = useTrips();
  const { loadFavorites, toggleFavorite, isFavorite } = useFavorites();
  const { budget, calculateBudget, setBudgetLimit, getCostForDay } = useBudget();
  const { fetchWeatherForTrip } = useWeather();

  const [results, setResults] = useState<Array<{ place: Place; day?: number; activity_type?: string }>>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [addStopDay, setAddStopDay] = useState(0);
  const [customStopQuery, setCustomStopQuery] = useState('');
  const [customStopResults, setCustomStopResults] = useState<Place[]>([]);
  const [searchingCustom, setSearchingCustom] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Load favorites and trips when sync code is set
  useEffect(() => {
    if (syncCode) {
      loadFavorites();
      loadTrips();
    }
  }, [syncCode, loadFavorites, loadTrips]);

  // Calculate budget when trip changes
  useEffect(() => {
    if (state.tripDays.length > 0) {
      calculateBudget(state.tripDays);
    }
  }, [state.tripDays, calculateBudget]);

  // Fetch weather when trip is loaded
  useEffect(() => {
    const loadWeather = async () => {
      if (state.tripDays.length > 0) {
        const startDate = new Date();
        const forecasts = await fetchWeatherForTrip(state.tripDays, startDate);

        // Update each day with its weather
        if (forecasts.length > 0) {
          const updatedDays = state.tripDays.map((day, index) => ({
            ...day,
            weather: forecasts[index] || undefined,
          }));
          dispatch({ type: 'SET_TRIP_DAYS', payload: updatedDays });
        }
      }
    };
    loadWeather();
  }, [state.tripSummary]); // Only run when a new trip is loaded (summary changes)

  // Load trip from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('trip');
    const urlSyncCode = params.get('sync');

    if (urlSyncCode && tripId) {
      const loadSharedTrip = async () => {
        try {
          const data = await api.get<{ trips: Trip[] }>(`/trips/${urlSyncCode}`);
          const trip = data.trips.find(t => t.id === tripId);
          if (trip) {
            loadTrip(trip);
          }
        } catch (err) {
          console.log('Failed to load shared trip:', err);
        }
      };
      loadSharedTrip();
    }
  }, []);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const createSyncCode = async () => {
    setSyncLoading(true);
    try {
      const data = await api.post<{ sync_code: string }>('/sync/create', {});
      setSyncCode(data.sync_code);
      setShowSyncModal(false);
    } catch (err) {
      console.log('Failed to create sync code:', err);
    }
    setSyncLoading(false);
  };

  const useSyncCodeFromInput = () => {
    if (syncInput.trim()) {
      const code = syncInput.trim().toUpperCase();
      setSyncCode(code);
      setShowSyncModal(false);
      setSyncInput('');
    }
  };

  const handlePlanTrip = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    setResults([]);

    try {
      const data = await api.post<{ days: DayPlan[]; summary: string }>('/plan', {
        query: state.query,
      });

      dispatch({ type: 'SET_TRIP', payload: { days: data.days, summary: data.summary } });

      const allPlaces = data.days.flatMap(day =>
        day.activities
          .filter(act => act.place)
          .map(act => ({ place: act.place!, day: day.day, activity_type: act.activity_type }))
      );
      setResults(allPlaces);
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Could not plan trip',
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSearch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'CLEAR_TRIP' });

    try {
      const data = await api.get<{ results: Place[] }>(
        `/search?query=${encodeURIComponent(state.query)}`
      );
      setResults(data.results.map(place => ({ place })));
      dispatch({ type: 'SET_MODE', payload: 'search' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Could not connect to server' });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const handleSaveTrip = async () => {
    if (!state.tripDays.length) return;

    if (!syncCode) {
      setShowSyncModal(true);
      return;
    }

    const tripId = generateTripId();
    const success = await saveTrip({
      tripId,
      query: state.query,
      summary: state.tripSummary,
      days: state.tripDays,
    });

    if (success) {
      triggerConfetti();
    }
  };

  const loadTrip = (trip: Trip) => {
    dispatch({ type: 'SET_QUERY', payload: trip.query });
    dispatch({ type: 'SET_TRIP', payload: { days: trip.days, summary: trip.summary } });
    setShowSavedTrips(false);

    const allPlaces = trip.days.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place!, day: day.day, activity_type: act.activity_type }))
    );
    setResults(allPlaces);
  };

  const enterEditMode = (trip: Trip) => {
    loadTrip(trip);
    dispatch({ type: 'ENTER_EDIT_MODE', payload: { tripId: trip.id } });
  };

  const handleSaveEdits = async () => {
    if (!state.editingTripId) return;

    const success = await updateTrip(state.editingTripId, {
      days: state.tripDays,
      summary: state.tripSummary,
    });

    if (success) {
      dispatch({ type: 'EXIT_EDIT_MODE' });
    }
  };

  const handleCancelEdit = () => {
    dispatch({ type: 'CANCEL_EDIT' });
  };

  const handleRemoveActivity = (dayIndex: number, activityIndex: number) => {
    dispatch({ type: 'REMOVE_ACTIVITY', payload: { dayIndex, activityIndex } });
    updateResultsFromDays();
  };

  const handleReorderActivities = (dayIndex: number, fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_ACTIVITIES', payload: { dayIndex, fromIndex, toIndex } });
    updateResultsFromDays();
  };

  const updateResultsFromDays = () => {
    const allPlaces = state.tripDays.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place!, day: day.day, activity_type: act.activity_type }))
    );
    setResults(allPlaces);
  };

  const searchCustomStop = async () => {
    if (!customStopQuery.trim()) return;
    setSearchingCustom(true);
    try {
      const data = await api.get<{ results: Place[] }>(
        `/search?query=${encodeURIComponent(customStopQuery)}&limit=5`
      );
      setCustomStopResults(data.results);
    } catch (err) {
      console.log('Custom search error:', err);
    }
    setSearchingCustom(false);
  };

  const addCustomStop = (place: Place, activityType: string = 'activity') => {
    if (addStopDay < 0 || addStopDay >= state.tripDays.length) return;

    const newActivity: Activity = {
      activity_type: activityType as Activity['activity_type'],
      description: 'Custom stop',
      place: { ...place, why: 'Added by you' },
    };

    dispatch({ type: 'ADD_ACTIVITY', payload: { dayIndex: addStopDay, activity: newActivity } });
    setShowAddStop(false);
    setCustomStopQuery('');
    setCustomStopResults([]);
    updateResultsFromDays();
  };

  const exportTrip = () => {
    if (!state.tripDays.length) return;

    const activityIcons: Record<string, string> = {
      drive: '🚗',
      food: '🍽️',
      attraction: '🏛️',
      activity: '🎯',
      hotel: '🏨',
    };

    let text = `# ${state.tripSummary}\n\n`;
    if (state.routeInfo) {
      text += `Total: ${Math.round(state.routeInfo.distance / 1609.34)} miles, ${Math.floor(state.routeInfo.duration / 3600)}h ${Math.round((state.routeInfo.duration % 3600) / 60)}m driving\n\n`;
    }
    if (budget) {
      text += `Estimated Budget: $${budget.spent.toLocaleString()}\n\n`;
    }

    state.tripDays.forEach(day => {
      text += `## Day ${day.day}: ${day.date_label}\n\n`;
      day.activities.forEach(activity => {
        const icon = activityIcons[activity.activity_type] || '📍';
        if (activity.place) {
          text += `${icon} **${activity.place.name}**\n`;
          text += `   ${activity.description}\n`;
          text += `   📍 ${activity.place.address}\n`;
          if (activity.place.rating) text += `   ⭐ ${activity.place.rating}\n`;
        } else {
          text += `${icon} ${activity.description}\n`;
        }
        text += '\n';
      });
    });

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${state.tripSummary.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareTrip = async () => {
    if (!state.tripDays.length) return;

    if (!syncCode) {
      setShowSyncModal(true);
      return;
    }

    let tripId = trips.find(t => t.summary === state.tripSummary)?.id;
    if (!tripId) {
      tripId = generateTripId();
      await saveTrip({
        tripId,
        query: state.query,
        summary: state.tripSummary,
        days: state.tripDays,
      });
    }

    const url = `${window.location.origin}${window.location.pathname}?trip=${tripId}&sync=${syncCode}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!');
  };

  const handleSetBudgetLimit = () => {
    const limit = parseInt(budgetInput, 10);
    if (!isNaN(limit) && limit > 0) {
      setBudgetLimit(limit);
      setShowBudgetModal(false);
      setBudgetInput('');
    }
  };

  return (
    <div className="main-container" style={{ minHeight: '100vh' }}>
      {/* Dark Mode Toggle */}
      <button
        className="theme-toggle"
        onClick={toggleDarkMode}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Confetti */}
      <Confetti active={showConfetti} />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Header */}
      <header className="app-header">
        <h1>Road Trip Planner</h1>
        <p>Plan your perfect road trip with AI-powered recommendations</p>
      </header>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-row">
          <input
            className="input"
            value={state.query}
            onChange={e => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handlePlanTrip()}
            placeholder="e.g. '5 day roadtrip florida beaches and seafood'"
          />
          <button onClick={handleSearch} className="btn btn-secondary">
            Search
          </button>
          <button onClick={handlePlanTrip} className="btn btn-primary">
            Plan Trip
          </button>
        </div>
      </div>

      {/* Edit Mode Toolbar */}
      {state.editMode && (
        <div className="edit-toolbar">
          <span className="edit-indicator">✏️ Editing saved trip</span>
          <button onClick={handleSaveEdits} className="btn btn-primary">
            Save Changes
          </button>
          <button onClick={handleCancelEdit} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="action-bar">
        <button
          onClick={() => setShowSyncModal(true)}
          className={`btn btn-sm ${syncCode ? 'btn-secondary' : 'btn-ghost'}`}
        >
          {syncCode ? `🔄 Sync: ${syncCode}` : '🔄 Enable Sync'}
        </button>

        <button
          onClick={() => setShowSavedTrips(!showSavedTrips)}
          className={`btn btn-sm ${showSavedTrips ? 'btn-ghost active' : 'btn-ghost'}`}
        >
          📁 My Trips ({trips.length})
        </button>

        {state.tripDays.length > 0 && !state.editMode && (
          <>
            <button onClick={handleSaveTrip} className="btn btn-sm btn-ghost">
              💾 Save
            </button>
            <button onClick={shareTrip} className="btn btn-sm btn-ghost">
              🔗 Share
            </button>
            <button onClick={exportTrip} className="btn btn-sm btn-ghost">
              📄 Export
            </button>
          </>
        )}
      </div>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Saved Trips Panel */}
        {showSavedTrips && (
          <div className="saved-trips-panel">
            <h3>Saved Trips</h3>
            {trips.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-text">No saved trips yet</div>
                <div className="empty-state-hint">Plan a trip and save it to see it here</div>
              </div>
            ) : (
              <div>
                {trips.map(trip => (
                  <div key={trip.id} className="saved-trip-item">
                    <div className="saved-trip-info" onClick={() => loadTrip(trip)}>
                      <div className="saved-trip-title">{trip.summary}</div>
                      <div className="saved-trip-meta">
                        {new Date(trip.savedAt).toLocaleDateString()} • {trip.days.length} days
                      </div>
                    </div>
                    <div className="saved-trip-actions">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          enterEditMode(trip);
                        }}
                        className="btn btn-icon btn-ghost"
                        title="Edit trip"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteTrip(trip.id);
                        }}
                        className="delete-btn"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Code Modal */}
        {showSyncModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>🔄 Sync Favorites</h3>
                <button onClick={() => setShowSyncModal(false)} className="modal-close">
                  ×
                </button>
              </div>

              {syncCode ? (
                <div>
                  <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>Your sync code is:</p>
                  <div className="sync-code-display">{syncCode}</div>
                  <p
                    style={{
                      color: 'var(--gray-500)',
                      fontSize: '14px',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    Enter this code on another device to sync your favorites
                  </p>
                  <button
                    onClick={() => {
                      setSyncCode('');
                    }}
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
                    Sync your favorites across devices. Create a new code or enter an existing one.
                  </p>

                  <button
                    onClick={createSyncCode}
                    disabled={syncLoading}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '20px' }}
                  >
                    {syncLoading ? 'Creating...' : 'Create New Sync Code'}
                  </button>

                  <div style={{ textAlign: 'center', color: 'var(--gray-400)', marginBottom: '16px' }}>
                    — or enter existing code —
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      value={syncInput}
                      onChange={e => setSyncInput(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                      className="input"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        letterSpacing: '6px',
                        fontSize: '18px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    />
                    <button
                      onClick={useSyncCodeFromInput}
                      disabled={syncInput.length < 6}
                      className="btn btn-primary"
                      style={{ opacity: syncInput.length >= 6 ? 1 : 0.5 }}
                    >
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budget Modal */}
        {showBudgetModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>💰 Set Trip Budget</h3>
                <button onClick={() => setShowBudgetModal(false)} className="modal-close">
                  ×
                </button>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--gray-600)' }}>
                  Budget Limit ($)
                </label>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="e.g. 2000"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <button onClick={handleSetBudgetLimit} className="btn btn-primary" style={{ width: '100%' }}>
                Set Budget
              </button>
            </div>
          </div>
        )}

        {/* Add Custom Stop Modal */}
        {showAddStop && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '520px', maxHeight: '80vh', overflow: 'auto' }}>
              <div className="modal-header">
                <h3>Add Stop to Day {addStopDay + 1}</h3>
                <button
                  onClick={() => {
                    setShowAddStop(false);
                    setCustomStopResults([]);
                  }}
                  className="modal-close"
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  value={customStopQuery}
                  onChange={e => setCustomStopQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchCustomStop()}
                  placeholder="Search for a place..."
                  className="input"
                  style={{ flex: 1 }}
                />
                <button onClick={searchCustomStop} disabled={searchingCustom} className="btn btn-primary">
                  {searchingCustom ? '...' : 'Search'}
                </button>
              </div>

              {customStopResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {customStopResults.map(place => (
                    <div
                      key={place.place_id}
                      className="card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        gap: '12px',
                      }}
                    >
                      {place.photo_url && (
                        <img
                          src={place.photo_url}
                          alt={place.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius)',
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: 'var(--gray-800)' }}>{place.name}</div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--gray-500)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {place.address}
                        </div>
                        {place.rating && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                            ⭐ {place.rating}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => addCustomStop(place, 'food')}
                          className="btn btn-icon btn-ghost"
                          title="Add as food"
                        >
                          🍽️
                        </button>
                        <button
                          onClick={() => addCustomStop(place, 'attraction')}
                          className="btn btn-icon btn-ghost"
                          title="Add as attraction"
                        >
                          🏛️
                        </button>
                        <button
                          onClick={() => addCustomStop(place, 'activity')}
                          className="btn btn-icon btn-ghost"
                          title="Add as activity"
                        >
                          🎯
                        </button>
                        <button
                          onClick={() => addCustomStop(place, 'hotel')}
                          className="btn btn-icon btn-ghost"
                          title="Add as hotel"
                        >
                          🏨
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {state.loading && state.mode === 'plan' && (
          <div className="content-wrapper">
            <div className="loading-container" style={{ padding: '20px 0' }}>
              <div className="spinner"></div>
              <div className="loading-text">
                Planning your trip<span className="loading-dots"></span>
              </div>
            </div>
            <div className="content-layout">
              <div className="itinerary-panel">
                <SkeletonLoader />
              </div>
              <div className="map-panel">
                <div
                  className="skeleton"
                  style={{ height: '700px', borderRadius: 'var(--radius-lg)' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {state.loading && state.mode !== 'plan' && (
          <div className="loading-container">
            <div className="spinner spinner-lg"></div>
            <div className="loading-text">
              Searching<span className="loading-dots"></span>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 24px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 'var(--radius)',
              margin: '0 0 20px 0',
              border: '1px solid #fecaca',
            }}
          >
            {state.error}
          </div>
        )}

        {/* Trip Summary */}
        {state.tripSummary && (
          <div className="trip-summary">
            <div className="trip-summary-title">📍 {state.tripSummary}</div>
            <div className="trip-summary-stats">
              {state.routeInfo && (
                <>
                  <span>🚗 {Math.round(state.routeInfo.distance / 1609.34)} miles</span>
                  <span>
                    ⏱️ {Math.floor(state.routeInfo.duration / 3600)}h{' '}
                    {Math.round((state.routeInfo.duration % 3600) / 60)}m
                  </span>
                </>
              )}
              {budget && budget.spent > 0 && <span>💰 ~${budget.spent.toLocaleString()}</span>}
            </div>
          </div>
        )}

        {/* Selected Place Detail */}
        {state.selectedPlace && (
          <div className="place-detail">
            {state.selectedPlace.place.photo_url && (
              <img
                src={state.selectedPlace.place.photo_url}
                alt={state.selectedPlace.place.name}
                className="place-detail-image"
              />
            )}
            <div className="place-detail-content">
              <h2>{state.selectedPlace.place.name}</h2>
              <p>📍 {state.selectedPlace.place.address}</p>
              {state.selectedPlace.place.rating && (
                <p>
                  ⭐ {state.selectedPlace.place.rating} ({state.selectedPlace.place.rating_count}{' '}
                  reviews)
                </p>
              )}
              <p>🏷️ {state.selectedPlace.place.category}</p>
              {state.selectedPlace.place.why && <p>💡 {state.selectedPlace.place.why}</p>}
              <button
                onClick={() => dispatch({ type: 'SET_SELECTED_PLACE', payload: null })}
                className="btn btn-ghost"
                style={{ marginTop: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="content-layout">
          {/* Left Panel */}
          <div className="itinerary-panel">
            {/* Budget Tracker */}
            {state.tripDays.length > 0 && budget && (
              <BudgetTracker
                budget={budget}
                onOpenModal={() => setShowBudgetModal(true)}
              />
            )}

            {state.mode === 'plan' && state.tripDays.length > 0 ? (
              state.tripDays.map((day, dayIndex) => (
                <DayCard
                  key={`day-${day.day}`}
                  day={day}
                  dayIndex={dayIndex}
                  favorites={favorites}
                  estimatedCost={getCostForDay(day)}
                  onToggleFavorite={toggleFavorite}
                  onRemoveActivity={handleRemoveActivity}
                  onReorderActivities={handleReorderActivities}
                  onSelectPlace={data => dispatch({ type: 'SET_SELECTED_PLACE', payload: data })}
                  onAddStop={idx => {
                    setAddStopDay(idx);
                    setShowAddStop(true);
                  }}
                />
              ))
            ) : (
              <>
                {results.length > 0 && (
                  <p style={{ color: 'var(--gray-500)', marginBottom: '12px' }}>
                    Showing {results.length} places
                  </p>
                )}
                {results.length === 0 && !state.loading && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🗺️</div>
                    <div className="empty-state-text">Ready to plan your adventure?</div>
                    <div className="empty-state-hint">
                      Enter a destination above and click "Plan Trip"
                    </div>
                  </div>
                )}
                {results.map((result, index) => (
                  <PlaceCard
                    key={result.place.place_id}
                    place={result.place}
                    rank={index + 1}
                    isFavorite={isFavorite(result.place.place_id)}
                    onClick={() => dispatch({ type: 'SET_SELECTED_PLACE', payload: result })}
                    onToggleFavorite={() => toggleFavorite(result.place.place_id, result.place)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="map-panel">
            {state.tripDays.length > 1 && (
              <div className="map-toggle">
                <button
                  onClick={() => dispatch({ type: 'SET_MAP_VIEW', payload: 'daily' })}
                  className={`btn btn-sm ${state.mapView === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Day-by-Day
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_MAP_VIEW', payload: 'fullTrip' })}
                  className={`btn btn-sm ${state.mapView === 'fullTrip' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🗺️ Full Trip Route
                </button>
              </div>
            )}
            <Map
              results={results}
              tripDays={state.tripDays}
              onSelectPlace={data => dispatch({ type: 'SET_SELECTED_PLACE', payload: data })}
              onRouteInfo={info => dispatch({ type: 'SET_ROUTE_INFO', payload: info })}
              mapView={state.mapView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Root App with Providers
function App() {
  return (
    <AppProvider>
      <TripProvider>
        <AppContent />
      </TripProvider>
    </AppProvider>
  );
}

export default App;
