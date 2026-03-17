import { useState, useEffect } from 'react'
import Placecard from './PlaceCard'
import ActivityCard from './ActivityCard'
import 'leaflet/dist/leaflet.css'
import Map from './Map'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

// Icons for different activity types (used in export)
const activityIcons = {
  drive: '🚗',
  food: '🍽️',
  attraction: '🏛️',
  activity: '🎯',
  hotel: '🏨'
}

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Generate simple ID for trips
const generateTripId = () => Math.random().toString(36).substring(2, 10)

// Skeleton Loading Component
function SkeletonLoader() {
  return (
    <div>
      {[1, 2].map(day => (
        <div key={day} className="skeleton-card">
          <div className="skeleton skeleton-header"></div>
          {[1, 2, 3].map(activity => (
            <div key={activity} className="skeleton-activity">
              <div className="skeleton skeleton-icon"></div>
              <div className="skeleton skeleton-photo"></div>
              <div className="skeleton-content">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text-short"></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Confetti Component
function Confetti({ active }) {
  if (!active) return null

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    size: `${8 + Math.random() * 8}px`
  }))

  return (
    <div className="confetti-container">
      {confettiPieces.map(piece => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            width: piece.size,
            height: piece.size
          }}
        />
      ))}
    </div>
  )
}

function App(){
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [tripDays, setTripDays] = useState([])
  const [tripSummary, setTripSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [error, setError] = useState("")
  const [favorites, setFavorites] = useState([])
  const [syncCode, setSyncCode] = useState(() => {
    return localStorage.getItem("syncCode") || ""
  })
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncInput, setSyncInput] = useState("")
  const [syncLoading, setSyncLoading] = useState(false)
  const [savedTrips, setSavedTrips] = useState([])
  const [showSavedTrips, setShowSavedTrips] = useState(false)
  const [mode, setMode] = useState("search")
  const [routeInfo, setRouteInfo] = useState(null)
  const [mapView, setMapView] = useState("daily") // "daily" or "fullTrip"
  const [toasts, setToasts] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true"
  })
  const [showConfetti, setShowConfetti] = useState(false)

  // Apply dark mode on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem("darkMode", darkMode)
  }, [darkMode])

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Trigger confetti
  const triggerConfetti = () => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)
  }

  // Load trip from URL on mount
  // Load trip from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('trip')
    const urlSyncCode = params.get('sync')

    if (urlSyncCode && tripId) {
      // Load trip from shared URL
      const loadSharedTrip = async () => {
        try {
          const response = await fetch(`${API_URL}/trips/${urlSyncCode}`)
          if (response.ok) {
            const data = await response.json()
            const trip = data.trips.find(t => t.id === tripId)
            if (trip) {
              loadTrip(trip)
            }
          }
        } catch (err) {
          console.log("Failed to load shared trip:", err)
        }
      }
      loadSharedTrip()
    }
  }, [])

  // Load favorites and trips when sync code is set
  useEffect(() => {
    if (syncCode) {
      loadFavorites()
      loadTrips()
    }
  }, [syncCode])

  const loadFavorites = async () => {
    if (!syncCode) return
    try {
      const response = await fetch(`${API_URL}/favorites/${syncCode}`)
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites.map(f => f.place_id))
      }
    } catch (err) {
      console.log("Failed to load favorites:", err)
    }
  }

  const loadTrips = async () => {
    if (!syncCode) return
    try {
      const response = await fetch(`${API_URL}/trips/${syncCode}`)
      if (response.ok) {
        const data = await response.json()
        setSavedTrips(data.trips)
      }
    } catch (err) {
      console.log("Failed to load trips:", err)
    }
  }

  const createSyncCode = async () => {
    setSyncLoading(true)
    try {
      const response = await fetch(`${API_URL}/sync/create`, { method: 'POST' })
      const data = await response.json()
      setSyncCode(data.sync_code)
      localStorage.setItem("syncCode", data.sync_code)
      setShowSyncModal(false)
    } catch (err) {
      console.log("Failed to create sync code:", err)
    }
    setSyncLoading(false)
  }

  const useSyncCode = () => {
    if (syncInput.trim()) {
      const code = syncInput.trim().toUpperCase()
      setSyncCode(code)
      localStorage.setItem("syncCode", code)
      setShowSyncModal(false)
      setSyncInput("")
    }
  }

  const handleSearch = async() => {
    setLoading(true)
    setError("")
    setTripDays([])
    setTripSummary("")

    try{
      const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results.map(place => ({ place })))
      setMode("search")
    } catch(err){
      setError("Could not connect to server. Is the backend running?")
    }

    setLoading(false)
  }

  const handlePlanTrip = async() => {
    setLoading(true)
    setError("")
    setResults([])

    try{
      const response = await fetch(`${API_URL}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to plan trip')
      }

      const data = await response.json()
      setTripDays(data.days)
      setTripSummary(data.summary)

      const allPlaces = data.days.flatMap(day =>
        day.activities
          .filter(act => act.place)
          .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
      )
      setResults(allPlaces)
      setMode("plan")
    } catch(err){
      setError(err.message || "Could not plan trip. Is the backend running?")
    }

    setLoading(false)
  }

  const toggleFavorite = async (placeId, placeData = null) => {
    if (!syncCode) {
      setShowSyncModal(true)
      return
    }

    if (favorites.includes(placeId)) {
      // Remove from favorites
      try {
        await fetch(`${API_URL}/favorites/${syncCode}/${placeId}`, { method: 'DELETE' })
        setFavorites(favorites.filter(id => id !== placeId))
      } catch (err) {
        console.log("Failed to remove favorite:", err)
      }
    } else {
      // Add to favorites
      if (placeData) {
        try {
          await fetch(`${API_URL}/favorites/${syncCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              place_id: placeId,
              name: placeData.name,
              address: placeData.address,
              lat: placeData.lat,
              lng: placeData.lng,
              rating: placeData.rating,
              category: placeData.category,
              photo_url: placeData.photo_url
            })
          })
          setFavorites([...favorites, placeId])
        } catch (err) {
          console.log("Failed to add favorite:", err)
        }
      }
    }
  }

  const saveTrip = async () => {
    if (!tripDays.length) return

    if (!syncCode) {
      setShowSyncModal(true)
      return
    }

    const tripId = generateTripId()

    try {
      const response = await fetch(`${API_URL}/trips/${syncCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          query,
          summary: tripSummary,
          days: tripDays
        })
      })

      if (response.ok) {
        const trip = {
          id: tripId,
          query,
          summary: tripSummary,
          days: tripDays,
          savedAt: new Date().toISOString()
        }
        setSavedTrips([trip, ...savedTrips])
        showToast("Trip saved!")
        triggerConfetti()
      }
    } catch (err) {
      console.log("Failed to save trip:", err)
    }
  }

  const loadTrip = (trip) => {
    setQuery(trip.query)
    setTripSummary(trip.summary)
    setTripDays(trip.days)
    setMode("plan")
    setShowSavedTrips(false)

    const allPlaces = trip.days.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
    )
    setResults(allPlaces)
  }

  const deleteTrip = async (tripId) => {
    if (!syncCode) return

    try {
      await fetch(`${API_URL}/trips/${syncCode}/${tripId}`, { method: 'DELETE' })
      setSavedTrips(savedTrips.filter(t => t.id !== tripId))
    } catch (err) {
      console.log("Failed to delete trip:", err)
    }
  }

  const [showAddStop, setShowAddStop] = useState(false)
  const [addStopDay, setAddStopDay] = useState(0)
  const [customStopQuery, setCustomStopQuery] = useState("")
  const [customStopResults, setCustomStopResults] = useState([])
  const [searchingCustom, setSearchingCustom] = useState(false)

  const searchCustomStop = async () => {
    if (!customStopQuery.trim()) return
    setSearchingCustom(true)
    try {
      const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(customStopQuery)}&limit=5`)
      const data = await response.json()
      setCustomStopResults(data.results)
    } catch (err) {
      console.log("Custom search error:", err)
    }
    setSearchingCustom(false)
  }

  const addCustomStop = (place, activityType = "activity") => {
    if (addStopDay < 0 || addStopDay >= tripDays.length) return

    const newDays = [...tripDays]
    const newActivity = {
      activity_type: activityType,
      description: "Custom stop",
      place: { ...place, why: "Added by you" }
    }

    newDays[addStopDay] = {
      ...newDays[addStopDay],
      activities: [...newDays[addStopDay].activities, newActivity]
    }

    setTripDays(newDays)
    setShowAddStop(false)
    setCustomStopQuery("")
    setCustomStopResults([])

    // Update results for map
    const allPlaces = newDays.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
    )
    setResults(allPlaces)
  }

  const removeActivity = (dayIndex, activityIndex) => {
    const newDays = [...tripDays]
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      activities: newDays[dayIndex].activities.filter((_, i) => i !== activityIndex)
    }
    setTripDays(newDays)

    const allPlaces = newDays.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
    )
    setResults(allPlaces)
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for reordering activities
  const handleDragEnd = (event, dayIndex) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const newDays = [...tripDays]
      const activities = newDays[dayIndex].activities
      const oldIndex = activities.findIndex((_, i) => `${dayIndex}-${i}` === active.id)
      const newIndex = activities.findIndex((_, i) => `${dayIndex}-${i}` === over.id)

      newDays[dayIndex] = {
        ...newDays[dayIndex],
        activities: arrayMove(activities, oldIndex, newIndex)
      }
      setTripDays(newDays)

      // Update results for map
      const allPlaces = newDays.flatMap(day =>
        day.activities
          .filter(act => act.place)
          .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
      )
      setResults(allPlaces)
    }
  }

  const exportTrip = () => {
    if (!tripDays.length) return

    let text = `# ${tripSummary}\n\n`
    if (routeInfo) {
      text += `Total: ${Math.round(routeInfo.distance / 1609.34)} miles, ${Math.floor(routeInfo.duration / 3600)}h ${Math.round((routeInfo.duration % 3600) / 60)}m driving\n\n`
    }

    tripDays.forEach(day => {
      text += `## Day ${day.day}: ${day.date_label}\n\n`
      day.activities.forEach(activity => {
        const icon = activityIcons[activity.activity_type] || '📍'
        if (activity.place) {
          text += `${icon} **${activity.place.name}**\n`
          text += `   ${activity.description}\n`
          text += `   📍 ${activity.place.address}\n`
          if (activity.place.rating) text += `   ⭐ ${activity.place.rating}\n`
        } else {
          text += `${icon} ${activity.description}\n`
        }
        text += '\n'
      })
    })

    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-${tripSummary.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareTrip = async () => {
    if (!tripDays.length) return

    if (!syncCode) {
      setShowSyncModal(true)
      return
    }

    // Save first if not saved
    let tripId = savedTrips.find(t => t.summary === tripSummary)?.id
    if (!tripId) {
      tripId = generateTripId()
      try {
        await fetch(`${API_URL}/trips/${syncCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trip_id: tripId,
            query,
            summary: tripSummary,
            days: tripDays
          })
        })
        const trip = {
          id: tripId,
          query,
          summary: tripSummary,
          days: tripDays,
          savedAt: new Date().toISOString()
        }
        setSavedTrips([trip, ...savedTrips])
      } catch (err) {
        console.log("Failed to save trip for sharing:", err)
      }
    }

    const url = `${window.location.origin}${window.location.pathname}?trip=${tripId}&sync=${syncCode}`
    navigator.clipboard.writeText(url)
    showToast("Link copied to clipboard!")
  }

  return (
  <div className="main-container" style={{ minHeight: "100vh" }}>
    {/* Dark Mode Toggle */}
    <button
      className="theme-toggle"
      onClick={() => setDarkMode(!darkMode)}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? "☀️" : "🌙"}
    </button>

    {/* Confetti */}
    <Confetti active={showConfetti} />

    {/* Header */}
    <header className="app-header">
      <h1>Road Trip Planner</h1>
      <p>Plan your perfect road trip with AI-powered recommendations</p>
    </header>

    {/* Search Section */}
    <div className="search-section">
      <div className="search-row">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePlanTrip()}
          placeholder="e.g. '5 day roadtrip florida beaches and seafood'"
        />
        <button onClick={handleSearch} className="btn btn-secondary">
          Search
        </button>
        <button onClick={handlePlanTrip} className="btn btn-primary">
          Plan Trip
        </button>
      </div>
    </div>

    {/* Action Bar */}
    <div className="action-bar">
      <button
        onClick={() => setShowSyncModal(true)}
        className={`btn btn-sm ${syncCode ? 'btn-secondary' : 'btn-ghost'}`}
      >
        {syncCode ? `🔄 Sync: ${syncCode}` : "🔄 Enable Sync"}
      </button>

      <button
        onClick={() => setShowSavedTrips(!showSavedTrips)}
        className={`btn btn-sm ${showSavedTrips ? 'btn-ghost active' : 'btn-ghost'}`}
      >
        📁 My Trips ({savedTrips.length})
      </button>

      {tripDays.length > 0 && (
        <>
          <button onClick={saveTrip} className="btn btn-sm btn-ghost">
            💾 Save
          </button>
          <button onClick={shareTrip} className="btn btn-sm btn-ghost">
            🔗 Share
          </button>
          <button onClick={exportTrip} className="btn btn-sm btn-ghost">
            📄 Export
          </button>
        </>
      )}

    </div>

    {/* Toast Notifications */}
    {toasts.length > 0 && (
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? '✓' : '!'} {toast.message}
          </div>
        ))}
      </div>
    )}

    {/* Content Wrapper */}
    <div className="content-wrapper">

    {/* Saved Trips Panel */}
    {showSavedTrips && (
      <div className="saved-trips-panel">
        <h3>Saved Trips</h3>
        {savedTrips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">No saved trips yet</div>
            <div className="empty-state-hint">Plan a trip and save it to see it here</div>
          </div>
        ) : (
          <div>
            {savedTrips.map(trip => (
              <div key={trip.id} className="saved-trip-item" onClick={() => loadTrip(trip)}>
                <div className="saved-trip-info">
                  <div className="saved-trip-title">{trip.summary}</div>
                  <div className="saved-trip-meta">
                    {new Date(trip.savedAt).toLocaleDateString()} • {trip.days.length} days
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id) }} className="delete-btn">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Sync Code Modal */}
    {showSyncModal && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>🔄 Sync Favorites</h3>
            <button onClick={() => setShowSyncModal(false)} className="modal-close">×</button>
          </div>

          {syncCode ? (
            <div>
              <p style={{ color: "var(--gray-600)", marginBottom: "16px" }}>
                Your sync code is:
              </p>
              <div className="sync-code-display">
                {syncCode}
              </div>
              <p style={{ color: "var(--gray-500)", fontSize: "14px", textAlign: "center", marginBottom: "16px" }}>
                Enter this code on another device to sync your favorites
              </p>
              <button
                onClick={() => {
                  setSyncCode("")
                  localStorage.removeItem("syncCode")
                  setFavorites([])
                }}
                className="btn"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white"
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--gray-600)", marginBottom: "20px" }}>
                Sync your favorites across devices. Create a new code or enter an existing one.
              </p>

              <button
                onClick={createSyncCode}
                disabled={syncLoading}
                className="btn btn-secondary"
                style={{ width: "100%", marginBottom: "20px" }}
              >
                {syncLoading ? "Creating..." : "Create New Sync Code"}
              </button>

              <div style={{ textAlign: "center", color: "var(--gray-400)", marginBottom: "16px" }}>
                — or enter existing code —
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="input"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    letterSpacing: "6px",
                    fontSize: "18px",
                    fontWeight: "600",
                    textTransform: "uppercase"
                  }}
                />
                <button
                  onClick={useSyncCode}
                  disabled={syncInput.length < 6}
                  className="btn btn-primary"
                  style={{ opacity: syncInput.length >= 6 ? 1 : 0.5 }}
                >
                  Use
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {loading && mode === "plan" && (
      <div className="content-wrapper">
        <div className="loading-container" style={{ padding: "20px 0" }}>
          <div className="spinner"></div>
          <div className="loading-text">
            Planning your trip<span className="loading-dots"></span>
          </div>
        </div>
        <div className="content-layout">
          <div className="itinerary-panel">
            <SkeletonLoader />
          </div>
          <div className="map-panel">
            <div className="skeleton" style={{ height: "700px", borderRadius: "var(--radius-lg)" }}></div>
          </div>
        </div>
      </div>
    )}

    {loading && mode !== "plan" && (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
        <div className="loading-text">
          Searching<span className="loading-dots"></span>
        </div>
      </div>
    )}

    {error && (
      <div style={{
        textAlign: "center",
        padding: "16px 24px",
        background: "#fef2f2",
        color: "#dc2626",
        borderRadius: "var(--radius)",
        margin: "0 0 20px 0",
        border: "1px solid #fecaca"
      }}>
        {error}
      </div>
    )}

    {/* Trip Summary */}
    {tripSummary && (
      <div className="trip-summary">
        <div className="trip-summary-title">📍 {tripSummary}</div>
        {routeInfo && (
          <div className="trip-summary-stats">
            <span>🚗 {Math.round(routeInfo.distance / 1609.34)} miles total</span>
            <span>⏱️ {Math.floor(routeInfo.duration / 3600)}h {Math.round((routeInfo.duration % 3600) / 60)}m driving</span>
          </div>
        )}
      </div>
    )}

    {/* Selected Place Detail */}
    {selectedPlace && (
      <div className="place-detail">
        {selectedPlace.place.photo_url && (
          <img
            src={selectedPlace.place.photo_url}
            alt={selectedPlace.place.name}
            className="place-detail-image"
          />
        )}
        <div className="place-detail-content">
          <h2>{selectedPlace.place.name}</h2>
          <p>📍 {selectedPlace.place.address}</p>
          {selectedPlace.place.rating && (
            <p>⭐ {selectedPlace.place.rating} ({selectedPlace.place.rating_count} reviews)</p>
          )}
          <p>🏷️ {selectedPlace.place.category}</p>
          {selectedPlace.place.why && <p>💡 {selectedPlace.place.why}</p>}
          <button onClick={() => setSelectedPlace(null)} className="btn btn-ghost" style={{ marginTop: "12px" }}>
            Close
          </button>
        </div>
      </div>
    )}

    {/* Add Custom Stop Modal */}
    {showAddStop && (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: "520px", maxHeight: "80vh", overflow: "auto" }}>
          <div className="modal-header">
            <h3>Add Stop to Day {addStopDay + 1}</h3>
            <button
              onClick={() => { setShowAddStop(false); setCustomStopResults([]) }}
              className="modal-close"
            >×</button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              value={customStopQuery}
              onChange={(e) => setCustomStopQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCustomStop()}
              placeholder="Search for a place..."
              className="input"
              style={{ flex: 1 }}
            />
            <button
              onClick={searchCustomStop}
              disabled={searchingCustom}
              className="btn btn-primary"
            >
              {searchingCustom ? "..." : "Search"}
            </button>
          </div>

          {customStopResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {customStopResults.map(place => (
                <div
                  key={place.place_id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    gap: "12px"
                  }}
                >
                  {place.photo_url && (
                    <img
                      src={place.photo_url}
                      alt={place.name}
                      style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "var(--radius)" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "600", color: "var(--gray-800)" }}>{place.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--gray-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.address}</div>
                    {place.rating && <div style={{ fontSize: "12px", color: "var(--gray-600)" }}>⭐ {place.rating}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => addCustomStop(place, "food")} className="btn btn-icon btn-ghost" title="Add as food">🍽️</button>
                    <button onClick={() => addCustomStop(place, "attraction")} className="btn btn-icon btn-ghost" title="Add as attraction">🏛️</button>
                    <button onClick={() => addCustomStop(place, "activity")} className="btn btn-icon btn-ghost" title="Add as activity">🎯</button>
                    <button onClick={() => addCustomStop(place, "hotel")} className="btn btn-icon btn-ghost" title="Add as hotel">🏨</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    <div className="content-layout">
      {/* Left Panel */}
      <div className="itinerary-panel">
        {mode === "plan" && tripDays.length > 0 ? (
          tripDays.map((day, dayIndex) => (
            <div key={`day-${day.day}`} className="day-card">
              <div className="day-header">
                <span>Day {day.day}: {day.date_label}</span>
                <button
                  onClick={() => { setAddStopDay(dayIndex); setShowAddStop(true) }}
                  className="btn btn-sm"
                >
                  + Add Stop
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, dayIndex)}
              >
                <SortableContext
                  items={day.activities.map((_, idx) => `${dayIndex}-${idx}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {day.activities.map((activity, idx) => (
                      <ActivityCard
                        key={`${dayIndex}-${idx}`}
                        activityId={`${dayIndex}-${idx}`}
                        activity={activity}
                        isFavorite={activity.place ? favorites.includes(activity.place.place_id) : false}
                        onToggleFavorite={toggleFavorite}
                        onRemove={() => removeActivity(dayIndex, idx)}
                        onSelect={setSelectedPlace}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))
        ) : (
          <>
            {results.length > 0 && (
              <p style={{ color: "var(--gray-500)", marginBottom: "12px" }}>
                Showing {results.length} places
              </p>
            )}
            {results.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-state-icon">🗺️</div>
                <div className="empty-state-text">Ready to plan your adventure?</div>
                <div className="empty-state-hint">Enter a destination above and click "Plan Trip"</div>
              </div>
            )}
            {results.map((result, index) => (
              <Placecard
                key={result.place.place_id}
                name={result.place.name}
                rating={result.place.rating}
                rank={index + 1}
                onClick={() => setSelectedPlace(result)}
                isFavorite={favorites.includes(result.place.place_id)}
                onToggleFavorite={() => toggleFavorite(result.place.place_id, result.place)}
              />
            ))}
          </>
        )}
      </div>

      {/* Right Panel - Map */}
      <div className="map-panel">
        {tripDays.length > 1 && (
          <div className="map-toggle">
            <button
              onClick={() => setMapView("daily")}
              className={`btn btn-sm ${mapView === "daily" ? 'btn-primary' : 'btn-ghost'}`}
            >
              Day-by-Day
            </button>
            <button
              onClick={() => setMapView("fullTrip")}
              className={`btn btn-sm ${mapView === "fullTrip" ? 'btn-primary' : 'btn-ghost'}`}
            >
              🗺️ Full Trip Route
            </button>
          </div>
        )}
        <Map results={results} tripDays={tripDays} onSelectPlace={setSelectedPlace} onRouteInfo={setRouteInfo} mapView={mapView} />
      </div>
    </div>
    </div>
  </div>
)
}

export default App
