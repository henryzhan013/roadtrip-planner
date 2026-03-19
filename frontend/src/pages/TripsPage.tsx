import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../hooks/useTrips';
import { useTripContext } from '../context/TripContext';
import type { Trip } from '../types';

export function TripsPage() {
  const navigate = useNavigate();
  const { showToast, setSyncCode } = useAppContext();
  const { user } = useAuth();
  const { trips, loadTrips, deleteTrip } = useTrips();
  const { dispatch } = useTripContext();

  // Set the sync code from authenticated user
  useEffect(() => {
    if (user?.sync_code) {
      setSyncCode(user.sync_code);
    }
  }, [user, setSyncCode]);

  useEffect(() => {
    if (user?.sync_code) {
      loadTrips();
    }
  }, [user, loadTrips]);

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
