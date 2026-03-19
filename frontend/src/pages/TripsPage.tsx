import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTrips } from '../hooks/useTrips';
import { useTripContext } from '../context/TripContext';
import { api } from '../utils/api';
import type { Trip } from '../types';

export function TripsPage() {
  const navigate = useNavigate();
  const { syncCode, setSyncCode, showToast } = useAppContext();
  const { trips, loadTrips, deleteTrip } = useTrips();
  const { dispatch } = useTripContext();

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    if (syncCode) {
      loadTrips();
    }
  }, [syncCode, loadTrips]);

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

  const handleViewTrip = (trip: Trip) => {
    dispatch({ type: 'SET_QUERY', payload: trip.query });
    dispatch({ type: 'SET_TRIP', payload: { days: trip.days, summary: trip.summary } });
    navigate(`/plan?trip=${trip.id}`);
  };

  const handleEditTrip = (trip: Trip) => {
    dispatch({ type: 'SET_QUERY', payload: trip.query });
    dispatch({ type: 'SET_TRIP', payload: { days: trip.days, summary: trip.summary } });
    dispatch({ type: 'ENTER_EDIT_MODE', payload: { tripId: trip.id } });
    navigate(`/plan?trip=${trip.id}&edit=true`);
  };

  const handleDeleteTrip = async (tripId: string) => {
    await deleteTrip(tripId);
    showToast('Trip deleted');
  };

  if (!syncCode) {
    return (
      <div className="trips-page">
        <div className="trips-empty-state">
          <div className="empty-state-icon">🔄</div>
          <h2>Enable Sync to Save Trips</h2>
          <p>Create a sync code to save and access your trips across devices</p>
          <button onClick={() => setShowSyncModal(true)} className="btn btn-primary btn-lg">
            Get Started
          </button>
        </div>

        {/* Sync Modal */}
        {showSyncModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>🔄 Sync Your Trips</h3>
                <button onClick={() => setShowSyncModal(false)} className="modal-close">×</button>
              </div>

              <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
                Sync your trips across devices. Create a new code or enter an existing one.
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
                  }}
                />
                <button
                  onClick={useSyncCodeFromInput}
                  disabled={syncInput.length < 6}
                  className="btn btn-primary"
                >
                  Use
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="trips-page">
      <div className="trips-header">
        <h1>My Trips</h1>
        <button onClick={() => navigate('/plan')} className="btn btn-primary">
          + New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="trips-empty-state">
          <div className="empty-state-icon">📁</div>
          <h2>No saved trips yet</h2>
          <p>Plan a trip and save it to see it here</p>
          <button onClick={() => navigate('/plan')} className="btn btn-primary btn-lg">
            Plan Your First Trip
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div className="trip-card-header">
                <h3 className="trip-card-title">{trip.summary}</h3>
                <span className="trip-card-days">{trip.days.length} days</span>
              </div>

              <p className="trip-card-query">{trip.query}</p>

              <div className="trip-card-meta">
                <span>{new Date(trip.savedAt).toLocaleDateString()}</span>
                <span>{trip.days.reduce((acc, d) => acc + d.activities.length, 0)} stops</span>
              </div>

              <div className="trip-card-actions">
                <button onClick={() => handleViewTrip(trip)} className="btn btn-primary">
                  View
                </button>
                <button onClick={() => handleEditTrip(trip)} className="btn btn-secondary">
                  Edit
                </button>
                <button onClick={() => handleDeleteTrip(trip.id)} className="btn btn-ghost">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
