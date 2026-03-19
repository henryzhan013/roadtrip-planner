import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripContext } from '../context/TripContext';

interface Destination {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  category: string;
  suggestedQuery: string;
}

const destinations: Destination[] = [
  {
    id: 'austin',
    name: 'Austin',
    tagline: 'Live Music Capital of the World',
    description: 'Experience legendary 6th Street, world-class BBQ, and live music every night of the week.',
    image: '🎸',
    category: 'honky-tonk',
    suggestedQuery: '3 day Austin TX live music and BBQ trip',
  },
  {
    id: 'fort-worth',
    name: 'Fort Worth Stockyards',
    tagline: 'Where the West Begins',
    description: 'Watch the daily cattle drive, explore historic saloons, and experience authentic cowboy culture.',
    image: '🤠',
    category: 'cowboy',
    suggestedQuery: '2 day Fort Worth Stockyards cowboy experience',
  },
  {
    id: 'gruene',
    name: 'Gruene Hall',
    tagline: "Texas' Oldest Dance Hall",
    description: 'Dance the night away at this 1878 landmark where legends like Willie Nelson have played.',
    image: '🪕',
    category: 'honky-tonk',
    suggestedQuery: 'Weekend trip to Gruene and New Braunfels TX',
  },
  {
    id: 'luckenbach',
    name: 'Luckenbach',
    tagline: "Everybody's Somebody in Luckenbach",
    description: 'This tiny town made famous by Waylon Jennings is pure Texas Hill Country magic.',
    image: '🎶',
    category: 'honky-tonk',
    suggestedQuery: 'Day trip to Luckenbach and Fredericksburg TX',
  },
  {
    id: 'bandera',
    name: 'Bandera',
    tagline: 'Cowboy Capital of the World',
    description: 'Stay at a real dude ranch, go horseback riding, and two-step at the 11th Street Cowboy Bar.',
    image: '🐎',
    category: 'cowboy',
    suggestedQuery: '3 day Bandera TX dude ranch experience',
  },
  {
    id: 'amarillo',
    name: 'Amarillo',
    tagline: 'Heart of Route 66',
    description: 'Try the 72oz steak challenge at Big Texan, visit Cadillac Ranch, and cruise Route 66.',
    image: '🚗',
    category: 'road-trip',
    suggestedQuery: 'Route 66 road trip through Amarillo TX',
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    tagline: 'Remember the Alamo',
    description: 'Walk the famous River Walk, visit the Alamo, and enjoy Tex-Mex at its finest.',
    image: '🏰',
    category: 'culture',
    suggestedQuery: '3 day San Antonio history and food tour',
  },
  {
    id: 'marfa',
    name: 'Marfa',
    tagline: 'Desert Art & Mystery Lights',
    description: 'Discover world-class art installations, watch for the mysterious Marfa lights, and explore Big Bend.',
    image: '🌵',
    category: 'adventure',
    suggestedQuery: 'West Texas road trip Marfa and Big Bend',
  },
];

const categories = [
  { id: 'all', name: 'All', icon: '🌟' },
  { id: 'honky-tonk', name: 'Honky Tonks', icon: '🎸' },
  { id: 'cowboy', name: 'Cowboy Culture', icon: '🤠' },
  { id: 'road-trip', name: 'Road Trip', icon: '🚗' },
  { id: 'culture', name: 'Culture', icon: '🏛️' },
  { id: 'adventure', name: 'Adventure', icon: '🌵' },
];

export function ExplorePage() {
  const navigate = useNavigate();
  const { dispatch } = useTripContext();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDestinations = destinations.filter(dest => {
    const matchesCategory = activeCategory === 'all' || dest.category === activeCategory;
    const matchesSearch =
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartTrip = (destination: Destination) => {
    dispatch({ type: 'SET_QUERY', payload: destination.suggestedQuery });
    navigate('/plan?start=true');
  };

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <h1>Explore Texas</h1>
        <p className="explore-tagline">
          Discover honky tonks, cowboy culture, and legendary road trips across the Lone Star State
        </p>

        <div className="explore-search">
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="explore-search-input"
          />
        </div>
      </section>

      <section className="explore-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-name">{cat.name}</span>
          </button>
        ))}
      </section>

      <section className="explore-grid">
        {filteredDestinations.map(dest => (
          <div key={dest.id} className="destination-card">
            <div className="destination-image">
              <span className="destination-emoji">{dest.image}</span>
            </div>
            <div className="destination-content">
              <h3 className="destination-name">{dest.name}</h3>
              <p className="destination-tagline">{dest.tagline}</p>
              <p className="destination-description">{dest.description}</p>
              <button
                className="btn btn-primary"
                onClick={() => handleStartTrip(dest)}
              >
                Plan This Trip
              </button>
            </div>
          </div>
        ))}
      </section>

      {filteredDestinations.length === 0 && (
        <div className="explore-empty">
          <span className="empty-icon">🔍</span>
          <h3>No destinations found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}

      <section className="explore-cta">
        <h2>Can't find what you're looking for?</h2>
        <p>Create a custom trip with our AI trip planner</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/plan')}
        >
          Plan Custom Trip
        </button>
      </section>
    </div>
  );
}
