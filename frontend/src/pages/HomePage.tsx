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
    { query: '5 day Florida beaches and seafood', icon: '🏖️', image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&q=80' },
    { query: 'Weekend Austin TX live music and BBQ', icon: '🎸', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80' },
    { query: '3 day California coast road trip', icon: '🌊', image: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400&q=80' },
    { query: 'NYC to Boston historic sites tour', icon: '🏛️', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&q=80' },
  ];

  return (
    <div className="home-page">
      {/* Hero Section with Animations */}
      <section className="hero">
        {/* Floating background elements */}
        <div className="hero-bg-elements">
          <div className="floating-element floating-1">🚗</div>
          <div className="floating-element floating-2">✈️</div>
          <div className="floating-element floating-3">🗺️</div>
          <div className="floating-element floating-4">⛰️</div>
          <div className="floating-element floating-5">🌴</div>
          <div className="floating-element floating-6">🏕️</div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Plan Your Perfect</span>
            <span className="title-highlight">Road Trip</span>
          </h1>
          <p className="hero-subtitle">
            AI-powered itineraries with real places, maps, and routes
          </p>

          <div className="hero-search">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="hero-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlanTrip()}
                placeholder="Where do you want to go?"
              />
            </div>
            <button onClick={handlePlanTrip} className="btn btn-primary btn-lg btn-glow">
              Plan Trip
            </button>
          </div>
        </div>
      </section>

      {/* Example Trips with Images */}
      <section className="examples-section">
        <h2>Try an example</h2>
        <div className="examples-grid">
          {exampleTrips.map((trip, index) => (
            <button
              key={index}
              className="example-card-new"
              onClick={() => {
                dispatch({ type: 'SET_QUERY', payload: trip.query });
                navigate('/plan?start=true');
              }}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="example-card-image">
                <img src={trip.image} alt={trip.query} loading="lazy" />
                <div className="example-card-overlay"></div>
              </div>
              <div className="example-card-content">
                <span className="example-icon">{trip.icon}</span>
                <span className="example-text">{trip.query}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>How it works</h2>
        <div className="features-grid">
          <div className="feature-card" style={{ animationDelay: '0ms' }}>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">🤖</div>
            </div>
            <h3>AI-Powered Planning</h3>
            <p>Describe your ideal trip and get a complete day-by-day itinerary</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '100ms' }}>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">📍</div>
            </div>
            <h3>Real Places</h3>
            <p>All recommendations come from Google Places with ratings and photos</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '200ms' }}>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">🗺️</div>
            </div>
            <h3>Interactive Maps</h3>
            <p>See your route with real driving directions and distances</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '300ms' }}>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">💰</div>
            </div>
            <h3>Budget Tracking</h3>
            <p>Estimated costs per day based on your stops</p>
          </div>
        </div>
      </section>
    </div>
  );
}
