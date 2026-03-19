import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTrips } from '../../hooks/useTrips';

export function Navbar() {
  const location = useLocation();
  const { darkMode, toggleDarkMode, syncCode } = useAppContext();
  const { trips } = useTrips();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          🗺️ Road Trip Planner
        </Link>
      </div>

      <div className="navbar-links">
        <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
          Home
        </Link>
        <Link to="/plan" className={`navbar-link ${isActive('/plan') ? 'active' : ''}`}>
          Plan Trip
        </Link>
        <Link to="/trips" className={`navbar-link ${isActive('/trips') ? 'active' : ''}`}>
          My Trips
          {trips.length > 0 && <span className="navbar-badge">{trips.length}</span>}
        </Link>
      </div>

      <div className="navbar-actions">
        {syncCode && (
          <span className="navbar-sync">
            🔄 {syncCode}
          </span>
        )}
        <button
          className="theme-toggle-nav"
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
