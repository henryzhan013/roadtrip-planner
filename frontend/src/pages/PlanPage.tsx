import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTripContext } from '../context/TripContext';
import { useAppContext } from '../context/AppContext';
import { useTrips } from '../hooks/useTrips';
import { useFavorites } from '../hooks/useFavorites';
import { useBudget } from '../hooks/useBudget';
import { api } from '../utils/api';
import { DayCard } from '../components/trip/DayCard';
import { PlaceCard } from '../components/trip/PlaceCard';
import { Map } from '../components/map/Map';
import { BudgetTracker } from '../components/budget/BudgetTracker';
import type { Place, DayPlan, Activity } from '../types';

const generateTripId = () => Math.random().toString(36).substring(2, 10);

const TRAVEL_TIPS = [
  { icon: '🎒', tip: 'Pack a portable charger - you\'ll need it for navigation!' },
  { icon: '📸', tip: 'Golden hour is 1 hour after sunrise and before sunset for best photos' },
  { icon: '⛽', tip: 'Fill up when you hit half tank on rural roads' },
  { icon: '🍽️', tip: 'Ask locals for restaurant recommendations - they know the hidden gems' },
  { icon: '🗺️', tip: 'Download offline maps before you lose signal' },
  { icon: '☕', tip: 'Local coffee shops often have better wifi than chains' },
  { icon: '🚗', tip: 'Take breaks every 2 hours to stay alert on long drives' },
  { icon: '📱', tip: 'Screenshot important reservations in case you lose connection' },
  { icon: '🌅', tip: 'Arrive at popular spots early to beat the crowds' },
  { icon: '💡', tip: 'Hotel parking can be expensive - check prices beforehand' },
];

const LOADING_STAGES = [
  { text: 'Understanding your trip preferences', icon: '🧠' },
  { text: 'Finding the best routes', icon: '🛣️' },
  { text: 'Discovering amazing restaurants', icon: '🍽️' },
  { text: 'Locating must-see attractions', icon: '🏛️' },
  { text: 'Searching for perfect hotels', icon: '🏨' },
  { text: 'Optimizing your itinerary', icon: '✨' },
];

// Road trip playlist recommendations by region/theme
const PLAYLIST_DATA: Record<string, { genres: string[]; artists: string[]; vibe: string }> = {
  texas: {
    genres: ['Texas Country', 'Red Dirt', 'Outlaw Country', 'Tejano'],
    artists: ['George Strait', 'Willie Nelson', 'Turnpike Troubadours', 'Midland', 'Cody Johnson', 'Pat Green', 'Randy Rogers Band', 'Koe Wetzel'],
    vibe: 'Dust, boots, and endless highways',
  },
  nashville: {
    genres: ['Country', 'Americana', 'Bluegrass', 'Southern Rock'],
    artists: ['Chris Stapleton', 'Sturgill Simpson', 'Tyler Childers', 'Jason Isbell', 'Margo Price', 'Dolly Parton'],
    vibe: 'Honky tonk nights and music history',
  },
  'new orleans': {
    genres: ['Jazz', 'Blues', 'Zydeco', 'Funk', 'Brass Band'],
    artists: ['Louis Armstrong', 'Dr. John', 'Preservation Hall Jazz Band', 'Trombone Shorty', 'Rebirth Brass Band', 'Allen Toussaint'],
    vibe: 'Soul, swamp, and second lines',
  },
  california: {
    genres: ['West Coast Rock', 'Surf Rock', 'California Country', 'West Coast Hip-Hop'],
    artists: ['Eagles', 'Red Hot Chili Peppers', 'Tom Petty', 'Sublime', 'Fleetwood Mac', 'Beach Boys', 'Tupac', 'Kendrick Lamar'],
    vibe: 'Pacific sunsets and coastal cruising',
  },
  'pacific coast': {
    genres: ['Surf Rock', 'Indie Folk', 'California Rock'],
    artists: ['Jack Johnson', 'Bon Iver', 'Fleet Foxes', 'The War on Drugs', 'Lord Huron', 'Khruangbin'],
    vibe: 'Ocean breeze and winding roads',
  },
  southwest: {
    genres: ['Desert Rock', 'Americana', 'Indie Western'],
    artists: ['Calexico', 'Giant Sand', 'Marty Robbins', 'Townes Van Zandt', 'Colter Wall', 'Charley Crockett'],
    vibe: 'Desert sunsets and open range',
  },
  'new england': {
    genres: ['Folk Rock', 'Indie', 'Celtic Folk'],
    artists: ['James Taylor', 'The Dropkick Murphys', 'Dispatch', 'Guster', 'Vampire Weekend', 'The National'],
    vibe: 'Autumn leaves and coastal charm',
  },
  florida: {
    genres: ['Southern Rock', 'Beach Music', 'Latin Pop', 'Miami Bass'],
    artists: ['Tom Petty', 'Lynyrd Skynyrd', 'Jimmy Buffett', 'Pitbull', 'Gloria Estefan', 'KC and the Sunshine Band'],
    vibe: 'Palm trees and endless summer',
  },
  'pacific northwest': {
    genres: ['Grunge', 'Indie Rock', 'Folk'],
    artists: ['Nirvana', 'Pearl Jam', 'Modest Mouse', 'Death Cab for Cutie', 'Fleet Foxes', 'Band of Horses'],
    vibe: 'Misty forests and coffee shops',
  },
  seattle: {
    genres: ['Grunge', 'Alternative Rock', 'Indie'],
    artists: ['Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Foo Fighters', 'Death Cab for Cutie'],
    vibe: 'Rain-soaked rock and roll',
  },
  memphis: {
    genres: ['Blues', 'Soul', 'Rock n Roll', 'R&B'],
    artists: ['Elvis Presley', 'B.B. King', 'Otis Redding', 'Johnny Cash', 'Al Green', 'Booker T. & the M.G.\'s'],
    vibe: 'Where rock and soul were born',
  },
  colorado: {
    genres: ['Bluegrass', 'Jam Band', 'Folk Rock'],
    artists: ['John Denver', 'String Cheese Incident', 'Yonder Mountain', 'Nathaniel Rateliff', 'The Lumineers', 'Big Head Todd'],
    vibe: 'Mountain highs and festival nights',
  },
  'road trip': {
    genres: ['Classic Rock', 'Americana', 'Driving Songs'],
    artists: ['Tom Petty', 'Bruce Springsteen', 'CCR', 'The Eagles', 'Lynyrd Skynyrd', 'Bob Seger'],
    vibe: 'Open road anthems',
  },
  default: {
    genres: ['Classic Rock', 'Indie', 'Americana'],
    artists: ['Tom Petty', 'Fleetwood Mac', 'The Lumineers', 'Hozier', 'The War on Drugs', 'Khruangbin'],
    vibe: 'Perfect for any adventure',
  },
};

function getPlaylistForTrip(query: string): { genres: string[]; artists: string[]; vibe: string; region: string } {
  const lowerQuery = query.toLowerCase();

  // Check for specific matches
  const keywords = Object.keys(PLAYLIST_DATA).filter(k => k !== 'default');
  for (const keyword of keywords) {
    if (lowerQuery.includes(keyword)) {
      return { ...PLAYLIST_DATA[keyword], region: keyword };
    }
  }

  // Check for state/region patterns
  if (lowerQuery.includes('texas') || lowerQuery.includes(' tx')) {
    return { ...PLAYLIST_DATA.texas, region: 'Texas' };
  }
  if (lowerQuery.includes('tennessee') || lowerQuery.includes('nashville')) {
    return { ...PLAYLIST_DATA.nashville, region: 'Nashville' };
  }
  if (lowerQuery.includes('louisiana') || lowerQuery.includes('cajun')) {
    return { ...PLAYLIST_DATA['new orleans'], region: 'Louisiana' };
  }
  if (lowerQuery.includes('arizona') || lowerQuery.includes('utah') || lowerQuery.includes('nevada') || lowerQuery.includes('new mexico')) {
    return { ...PLAYLIST_DATA.southwest, region: 'Southwest' };
  }
  if (lowerQuery.includes('oregon') || lowerQuery.includes('washington') || lowerQuery.includes('seattle') || lowerQuery.includes('portland')) {
    return { ...PLAYLIST_DATA['pacific northwest'], region: 'Pacific Northwest' };
  }
  if (lowerQuery.includes('maine') || lowerQuery.includes('vermont') || lowerQuery.includes('boston') || lowerQuery.includes('massachusetts')) {
    return { ...PLAYLIST_DATA['new england'], region: 'New England' };
  }
  if (lowerQuery.includes('colorado') || lowerQuery.includes('denver')) {
    return { ...PLAYLIST_DATA.colorado, region: 'Colorado' };
  }
  if (lowerQuery.includes('florida') || lowerQuery.includes('miami') || lowerQuery.includes('keys')) {
    return { ...PLAYLIST_DATA.florida, region: 'Florida' };
  }
  if (lowerQuery.includes('california') || lowerQuery.includes('la') || lowerQuery.includes('san francisco') || lowerQuery.includes('san diego')) {
    return { ...PLAYLIST_DATA.california, region: 'California' };
  }

  return { ...PLAYLIST_DATA.default, region: 'Road Trip' };
}

function PlaylistSection({ query }: { query: string }) {
  const playlist = getPlaylistForTrip(query);
  const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(playlist.artists[0] + ' ' + playlist.genres[0])}`;

  return (
    <div className="playlist-section">
      <div className="playlist-header">
        <span className="playlist-icon">🎵</span>
        <h3>Road Trip Playlist</h3>
        <span className="playlist-region">{playlist.region}</span>
      </div>
      <p className="playlist-vibe">{playlist.vibe}</p>
      <div className="playlist-content">
        <div className="playlist-genres">
          <span className="playlist-label">Genres</span>
          <div className="playlist-tags">
            {playlist.genres.map(genre => (
              <span key={genre} className="playlist-tag genre-tag">{genre}</span>
            ))}
          </div>
        </div>
        <div className="playlist-artists">
          <span className="playlist-label">Artists</span>
          <div className="playlist-tags">
            {playlist.artists.slice(0, 6).map(artist => (
              <span key={artist} className="playlist-tag artist-tag">{artist}</span>
            ))}
          </div>
        </div>
      </div>
      <a href={spotifySearch} target="_blank" rel="noopener noreferrer" className="btn btn-spotify">
        <span>🎧</span> Find on Spotify
      </a>
    </div>
  );
}

function TripLoader() {
  const [tipIndex, setTipIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TRAVEL_TIPS.length);
    }, 4000);

    const stageInterval = setInterval(() => {
      setStageIndex(prev => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 2500);

    return () => {
      clearInterval(tipInterval);
      clearInterval(stageInterval);
    };
  }, []);

  const currentTip = TRAVEL_TIPS[tipIndex];
  const currentStage = LOADING_STAGES[stageIndex];

  return (
    <div className="trip-loader">
      <div className="loader-animation">
        <div className="loader-car">🚗</div>
        <div className="loader-road">
          <div className="road-line"></div>
          <div className="road-line"></div>
          <div className="road-line"></div>
        </div>
      </div>

      <div className="loader-stage">
        <span className="stage-icon">{currentStage.icon}</span>
        <span className="stage-text">{currentStage.text}</span>
        <span className="loading-dots"></span>
      </div>

      <div className="loader-progress">
        {LOADING_STAGES.map((_, idx) => (
          <div
            key={idx}
            className={`progress-dot ${idx <= stageIndex ? 'active' : ''}`}
          />
        ))}
      </div>

      <div className="loader-tip">
        <span className="tip-icon">{currentTip.icon}</span>
        <span className="tip-text">{currentTip.tip}</span>
      </div>
    </div>
  );
}


function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    size: `${8 + Math.random() * 8}px`,
  }));
  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div key={p.id} className="confetti" style={{ left: p.left, animationDelay: p.delay, width: p.size, height: p.size }} />
      ))}
    </div>
  );
}

export function PlanPage() {
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useTripContext();
  const { syncCode, favorites } = useAppContext();
  const { saveTrip, updateTrip } = useTrips();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { budget, calculateBudget, setBudgetLimit, getCostForDay } = useBudget();

  const [results, setResults] = useState<Array<{ place: Place; day?: number; activity_type?: string }>>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [addStopDay, setAddStopDay] = useState(0);
  const [customStopQuery, setCustomStopQuery] = useState('');
  const [customStopResults, setCustomStopResults] = useState<Place[]>([]);
  const [searchingCustom, setSearchingCustom] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Auto-start planning if coming from home page
  useEffect(() => {
    if (searchParams.get('start') === 'true' && state.query && state.tripDays.length === 0) {
      handlePlanTrip();
    }
  }, [searchParams]);

  // Calculate budget when trip changes
  useEffect(() => {
    if (state.tripDays.length > 0) {
      calculateBudget(state.tripDays);
    }
  }, [state.tripDays, calculateBudget]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handlePlanTrip = async () => {
    if (!state.query.trim()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    setResults([]);

    try {
      const data = await api.post<{ days: DayPlan[]; summary: string }>('/plan', {
        query: state.query,
      });

      dispatch({ type: 'SET_TRIP', payload: { days: data.days, summary: data.summary } });

      const allPlaces = data.days.flatMap(day =>
        day.activities.filter(act => act.place).map(act => ({
          place: act.place!,
          day: day.day,
          activity_type: act.activity_type,
        }))
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
      const data = await api.get<{ results: Place[] }>(`/search?query=${encodeURIComponent(state.query)}`);
      setResults(data.results.map(place => ({ place })));
      dispatch({ type: 'SET_MODE', payload: 'search' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Could not connect to server' });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const handleSaveTrip = async () => {
    if (!state.tripDays.length || !syncCode) return;

    const tripId = generateTripId();
    const success = await saveTrip({
      tripId,
      query: state.query,
      summary: state.tripSummary,
      days: state.tripDays,
    });

    if (success) triggerConfetti();
  };

  const handleSaveEdits = async () => {
    if (!state.editingTripId) return;
    const success = await updateTrip(state.editingTripId, {
      days: state.tripDays,
      summary: state.tripSummary,
    });
    if (success) dispatch({ type: 'EXIT_EDIT_MODE' });
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
      day.activities.filter(act => act.place).map(act => ({
        place: act.place!,
        day: day.day,
        activity_type: act.activity_type,
      }))
    );
    setResults(allPlaces);
  };

  const searchCustomStop = async () => {
    if (!customStopQuery.trim()) return;
    setSearchingCustom(true);
    try {
      const data = await api.get<{ results: Place[] }>(`/search?query=${encodeURIComponent(customStopQuery)}&limit=5`);
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
    const icons: Record<string, string> = { drive: '🚗', food: '🍽️', attraction: '🏛️', activity: '🎯', hotel: '🏨' };
    let text = `# ${state.tripSummary}\n\n`;
    if (state.routeInfo) {
      text += `Total: ${Math.round(state.routeInfo.distance / 1609.34)} miles\n\n`;
    }
    state.tripDays.forEach(day => {
      text += `## Day ${day.day}: ${day.date_label}\n\n`;
      day.activities.forEach(act => {
        const icon = icons[act.activity_type] || '📍';
        if (act.place) {
          text += `${icon} **${act.place.name}**\n   ${act.description}\n   📍 ${act.place.address}\n\n`;
        } else {
          text += `${icon} ${act.description}\n\n`;
        }
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

  const handleSetBudgetLimit = () => {
    const limit = parseInt(budgetInput, 10);
    if (!isNaN(limit) && limit > 0) {
      setBudgetLimit(limit);
      setShowBudgetModal(false);
      setBudgetInput('');
    }
  };

  return (
    <div className="plan-page">
      <Confetti active={showConfetti} />

      {/* Search Section */}
      <div className="plan-search">
        <input
          className="input plan-input"
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

      {/* Edit Mode Toolbar */}
      {state.editMode && (
        <div className="edit-toolbar">
          <span className="edit-indicator">✏️ Editing saved trip</span>
          <button onClick={handleSaveEdits} className="btn btn-primary">
            Save Changes
          </button>
          <button onClick={() => dispatch({ type: 'CANCEL_EDIT' })} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      )}

      {/* Action Bar */}
      {state.tripDays.length > 0 && !state.editMode && (
        <div className="plan-actions">
          <button onClick={handleSaveTrip} className="btn btn-ghost" disabled={!syncCode}>
            💾 Save
          </button>
          <button onClick={exportTrip} className="btn btn-ghost">
            📄 Export
          </button>
        </div>
      )}

      {/* Loading */}
      {state.loading && <TripLoader />}

      {/* Error */}
      {state.error && (
        <div className="error-banner">{state.error}</div>
      )}

      {/* Trip Summary */}
      {state.tripSummary && !state.loading && (
        <div className="trip-summary-container">
          <div className="trip-summary">
            <div className="trip-summary-title">📍 {state.tripSummary}</div>
            <div className="trip-summary-stats">
              <span>📅 {state.tripDays.length} days</span>
              <span>📍 {state.tripDays.reduce((sum, d) => sum + d.activities.filter(a => a.place).length, 0)} stops</span>
              {budget && budget.spent > 0 && <span>💰 ~${budget.spent.toLocaleString()}</span>}
            </div>
          </div>
          <PlaylistSection query={state.query} />
        </div>
      )}

      {/* Content Layout */}
      {!state.loading && (
        <div className="content-layout">
          <div className="itinerary-panel">
            {state.tripDays.length > 0 && budget && (
              <BudgetTracker budget={budget} onOpenModal={() => setShowBudgetModal(true)} />
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
                  onAddStop={idx => { setAddStopDay(idx); setShowAddStop(true); }}
                />
              ))
            ) : (
              <>
                {results.length === 0 && !state.loading && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🗺️</div>
                    <div className="empty-state-text">Ready to plan your adventure?</div>
                    <div className="empty-state-hint">Enter a destination above and click "Plan Trip"</div>
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

          <div className="map-panel">
            <Map
              results={results}
              tripDays={state.tripDays}
              onSelectPlace={data => dispatch({ type: 'SET_SELECTED_PLACE', payload: data })}
            />
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddStop && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Add Stop to Day {addStopDay + 1}</h3>
              <button onClick={() => { setShowAddStop(false); setCustomStopResults([]); }} className="modal-close">×</button>
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
            {customStopResults.map(place => (
              <div key={place.place_id} className="custom-stop-result">
                {place.photo_url && <img src={place.photo_url} alt={place.name} />}
                <div className="custom-stop-info">
                  <div className="custom-stop-name">{place.name}</div>
                  <div className="custom-stop-address">{place.address}</div>
                </div>
                <div className="custom-stop-actions">
                  <button onClick={() => addCustomStop(place, 'food')} title="Food">🍽️</button>
                  <button onClick={() => addCustomStop(place, 'attraction')} title="Attraction">🏛️</button>
                  <button onClick={() => addCustomStop(place, 'activity')} title="Activity">🎯</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>💰 Set Trip Budget</h3>
              <button onClick={() => setShowBudgetModal(false)} className="modal-close">×</button>
            </div>
            <input
              type="number"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              placeholder="e.g. 2000"
              className="input"
              style={{ width: '100%', marginBottom: '16px' }}
            />
            <button onClick={handleSetBudgetLimit} className="btn btn-primary" style={{ width: '100%' }}>
              Set Budget
            </button>
          </div>
        </div>
      )}

      {/* Selected Place Detail */}
      {state.selectedPlace && (
        <div className="place-detail">
          {state.selectedPlace.place.photo_url && (
            <img src={state.selectedPlace.place.photo_url} alt={state.selectedPlace.place.name} className="place-detail-image" />
          )}
          <div className="place-detail-content">
            <h2>{state.selectedPlace.place.name}</h2>
            <p>📍 {state.selectedPlace.place.address}</p>
            {state.selectedPlace.place.rating && <p>⭐ {state.selectedPlace.place.rating}</p>}
            <button onClick={() => dispatch({ type: 'SET_SELECTED_PLACE', payload: null })} className="btn btn-ghost">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
