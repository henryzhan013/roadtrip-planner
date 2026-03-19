import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../hooks/useTrips';

export function ProfilePage() {
  const { darkMode, toggleDarkMode, showToast } = useAppContext();
  const { user } = useAuth();
  const { trips } = useTrips();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate saving
    showToast('Profile updated successfully!');
    setIsEditing(false);
  };

  const totalActivities = trips.reduce(
    (acc, trip) => acc + trip.days.reduce((d, day) => d + day.activities.length, 0),
    0
  );

  const totalDays = trips.reduce((acc, trip) => acc + trip.days.length, 0);

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="avatar-icon">👤</span>
        </div>
        <div className="profile-info">
          <h1>{user?.username || 'Traveler'}</h1>
          <p className="profile-email">{user?.email || 'traveler@example.com'}</p>
        </div>
      </div>

      <div className="profile-content">
        <section className="profile-section">
          <div className="section-header">
            <h2>Trip Statistics</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🗺️</span>
              <span className="stat-value">{trips.length}</span>
              <span className="stat-label">Saved Trips</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📅</span>
              <span className="stat-value">{totalDays}</span>
              <span className="stat-label">Total Days</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📍</span>
              <span className="stat-value">{totalActivities}</span>
              <span className="stat-label">Places Visited</span>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-header">
            <h2>Profile Settings</h2>
            {!isEditing && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form className="profile-form" onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={editForm.username}
                  onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">Username</span>
                <span className="detail-value">{user?.username || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{user?.email || 'Not set'}</span>
              </div>
            </div>
          )}
        </section>

        <section className="profile-section">
          <div className="section-header">
            <h2>Preferences</h2>
          </div>
          <div className="preferences-list">
            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Dark Mode</span>
                <span className="preference-description">
                  Use dark theme for better night viewing
                </span>
              </div>
              <button
                className={`toggle-switch ${darkMode ? 'active' : ''}`}
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-header">
            <h2>Account Actions</h2>
          </div>
          <div className="account-actions">
            <button
              className="btn btn-secondary"
              onClick={() => showToast('Password change feature coming soon!')}
            >
              Change Password
            </button>
            <button
              className="btn btn-danger"
              onClick={() => showToast('Please contact support to delete your account.')}
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
