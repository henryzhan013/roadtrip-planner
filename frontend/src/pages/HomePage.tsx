import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripContext } from '../context/TripContext';

export function HomePage() {
  const navigate = useNavigate();
  const { dispatch } = useTripContext();
  const [query, setQuery] = useState('');

  const handlePlanTrip = () => {
    if (query.trim()) {
      dispatch({ type: 'SET_QUERY', payload: query });
      navigate('/plan?start=true');
    }
  };

  const exampleTrips = [
    { query: '5 day Florida beaches and seafood', icon: '🏖️' },
    { query: 'Weekend Austin TX live music and BBQ', icon: '🎸' },
    { query: '3 day California coast road trip', icon: '🌊' },
    { query: 'NYC to Boston historic sites tour', icon: '🏛️' },
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">Plan Your Perfect Road Trip</h1>
        <p className="hero-subtitle">
          AI-powered itineraries with real places, maps, and routes
        </p>

        <div className="hero-search">
          <input
            type="text"
            className="hero-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePlanTrip()}
            placeholder="Where do you want to go?"
          />
          <button onClick={handlePlanTrip} className="btn btn-primary btn-lg">
            Plan Trip
          </button>
        </div>
      </section>

      {/* Example Trips */}
      <section className="examples-section">
        <h2>Try an example</h2>
        <div className="examples-grid">
          {exampleTrips.map((trip, index) => (
            <button
              key={index}
              className="example-card"
              onClick={() => {
                dispatch({ type: 'SET_QUERY', payload: trip.query });
                navigate('/plan?start=true');
              }}
            >
              <span className="example-icon">{trip.icon}</span>
              <span className="example-text">{trip.query}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>How it works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Planning</h3>
            <p>Describe your ideal trip and get a complete day-by-day itinerary</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Real Places</h3>
            <p>All recommendations come from Google Places with ratings and photos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Interactive Maps</h3>
            <p>See your route with real driving directions and distances</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Budget Tracking</h3>
            <p>Estimated costs per day based on your stops</p>
          </div>
        </div>
      </section>
    </div>
  );
}
