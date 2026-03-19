import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useAppContext();
  const { isAuthenticated, user, logout } = useAuth();
  const { trips } = useTrips();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
        {isAuthenticated && (
          <Link to="/trips" className={`navbar-link ${isActive('/trips') ? 'active' : ''}`}>
            My Trips
            {trips.length > 0 && <span className="navbar-badge">{trips.length}</span>}
          </Link>
        )}
      </div>

      <div className="navbar-actions">
        {isAuthenticated && user && (
          <span className="navbar-user">
            👤 {user.username}
          </span>
        )}

        {isAuthenticated ? (
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
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
