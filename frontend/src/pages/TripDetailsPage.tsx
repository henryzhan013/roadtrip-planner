import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../hooks/useTrips';
import { useTripContext } from '../context/TripContext';
import type { Trip } from '../types';

export function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { showToast, setSyncCode } = useAppContext();
  const { user } = useAuth();
  const { trips, loadTrips, deleteTrip } = useTrips();
  const { dispatch } = useTripContext();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set the sync code from authenticated user
  useEffect(() => {
    if (user?.sync_code) {
      setSyncCode(user.sync_code);
    }
  }, [user, setSyncCode]);

  // Load trips if not already loaded
  useEffect(() => {
    if (user?.sync_code && trips.length === 0) {
      loadTrips();
    }
  }, [user, trips.length, loadTrips]);

  // Find the specific trip
  useEffect(() => {
    if (trips.length > 0 && tripId) {
      const found = trips.find(t => t.id === tripId);
      setTrip(found || null);
      setIsLoading(false);
    } else if (trips.length > 0) {
      setIsLoading(false);
    }
  }, [trips, tripId]);

  const handleEditTrip = () => {
    if (!trip) return;
    dispatch({ type: 'SET_QUERY', payload: trip.query });
    dispatch({ type: 'SET_TRIP', payload: { days: trip.days, summary: trip.summary } });
    dispatch({ type: 'ENTER_EDIT_MODE', payload: { tripId: trip.id } });
    navigate(`/plan?trip=${trip.id}&edit=true`);
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    if (window.confirm('Are you sure you want to delete this trip?')) {
      await deleteTrip(trip.id);
      showToast('Trip deleted');
      navigate('/trips');
    }
  };

  const handleShareTrip = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="trip-details-page">
        <div className="trip-details-loading">
          <div className="loading-spinner"></div>
          <p>Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-details-page">
        <div className="trip-details-not-found">
          <span className="not-found-icon">🗺️</span>
          <h2>Trip Not Found</h2>
          <p>The trip you're looking for doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate('/trips')}>
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  const totalActivities = trip.days.reduce((acc, day) => acc + day.activities.length, 0);

  return (
    <div className="trip-details-page">
      <div className="trip-details-header">
        <button className="btn btn-ghost" onClick={() => navigate('/trips')}>
          ← Back to Trips
        </button>
        <div className="trip-details-actions">
          <button className="btn btn-secondary" onClick={handleShareTrip}>
            Share
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            Print
          </button>
          <button className="btn btn-primary" onClick={handleEditTrip}>
            Edit Trip
          </button>
          <button className="btn btn-danger" onClick={handleDeleteTrip}>
            Delete
          </button>
        </div>
      </div>

      <div className="trip-details-content">
        <div className="trip-details-overview">
          <h1>{trip.summary}</h1>
          <p className="trip-query">{trip.query}</p>

          <div className="trip-meta">
            <span className="meta-item">
              <span className="meta-icon">📅</span>
              {trip.days.length} days
            </span>
            <span className="meta-item">
              <span className="meta-icon">📍</span>
              {totalActivities} stops
            </span>
            <span className="meta-item">
              <span className="meta-icon">🕐</span>
              Saved {new Date(trip.savedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="trip-itinerary">
          {trip.days.map((day, dayIndex) => (
            <div key={dayIndex} className="day-section">
              <div className="day-header">
                <h2>Day {dayIndex + 1}</h2>
                {day.date_label && <span className="day-date">{day.date_label}</span>}
              </div>

              <div className="activities-list">
                {day.activities.map((activity, actIndex) => (
                  <div key={actIndex} className="activity-item">
                    <div className="activity-time">
                      {activity.time_slot || `Stop ${actIndex + 1}`}
                    </div>
                    <div className="activity-details">
                      <h3 className="activity-name">
                        {activity.place?.name || activity.description}
                      </h3>
                      {activity.place?.address && (
                        <p className="activity-address">{activity.place.address}</p>
                      )}
                      {activity.place?.rating && (
                        <div className="activity-rating">
                          ⭐ {activity.place.rating}
                          {activity.place.rating_count && (
                            <span className="rating-count">
                              ({activity.place.rating_count} reviews)
                            </span>
                          )}
                        </div>
                      )}
                      {activity.description && activity.place?.name && (
                        <p className="activity-notes">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
