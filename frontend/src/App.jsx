import { useState, useEffect } from 'react'
import Placecard from './PlaceCard'
import 'leaflet/dist/leaflet.css'
import Map from './Map'

// Icons for different activity types
const activityIcons = {
  drive: '🚗',
  food: '🍽️',
  attraction: '🏛️',
  activity: '🎯',
  hotel: '🏨'
}

// Price level display
const priceLevels = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$'
}

// Generate booking/map links for a place
const getPlaceLinks = (place) => {
  const encodedName = encodeURIComponent(place.name)
  const encodedAddress = encodeURIComponent(place.address || '')

  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedName}+${encodedAddress}&query_place_id=${place.place_id}`,
    googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodedName}+${encodedAddress}&destination_place_id=${place.place_id}`,
    yelp: `https://www.yelp.com/search?find_desc=${encodedName}&find_loc=${encodedAddress}`,
    bookGoogle: `https://www.google.com/search?q=${encodedName}+${encodedAddress}+reservations+booking`
  }
}

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Generate simple ID for trips
const generateTripId = () => Math.random().toString(36).substring(2, 10)

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
  const [shareMessage, setShareMessage] = useState("")
  const [routeInfo, setRouteInfo] = useState(null)
  const [mapView, setMapView] = useState("daily") // "daily" or "fullTrip"

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
        setShareMessage("Trip saved!")
        setTimeout(() => setShareMessage(""), 2000)
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

  const moveActivity = (dayIndex, activityIndex, direction) => {
    const newDays = [...tripDays]
    const activities = [...newDays[dayIndex].activities]
    const newIndex = activityIndex + direction

    if (newIndex < 0 || newIndex >= activities.length) return

    // Swap
    const temp = activities[activityIndex]
    activities[activityIndex] = activities[newIndex]
    activities[newIndex] = temp

    newDays[dayIndex] = { ...newDays[dayIndex], activities }
    setTripDays(newDays)

    // Update results for map
    const allPlaces = newDays.flatMap(day =>
      day.activities
        .filter(act => act.place)
        .map(act => ({ place: act.place, day: day.day, activity_type: act.activity_type }))
    )
    setResults(allPlaces)
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
    setShareMessage("Link copied!")
    setTimeout(() => setShareMessage(""), 2000)
  }

  return (
  <div className="main-container" style={{
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh"
  }}>
    <h1 style={{ textAlign: "center", color: "#333" }}>🚗 Road Trip Planner</h1>

    <p style={{ textAlign: "center", color: "#666", marginBottom: "20px"}}>
      Plan your perfect road trip with AI-powered recommendations
    </p>

    {/* Search Bar */}
    <div className="search-container" style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
      <input
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handlePlanTrip()}
        placeholder="e.g. '5 day roadtrip florida beaches and seafood'"
        style={{
          padding: "12px",
          width: "400px",
          marginRight: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontSize: "16px"
        }}
      />
      <div className="search-buttons" style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleSearch} style={{
          padding: "12px 24px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px"
        }}>
          Search
        </button>
        <button onClick={handlePlanTrip} style={{
          padding: "12px 24px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px"
        }}>
          Plan Trip
        </button>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="action-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
      <button onClick={() => setShowSyncModal(true)} style={{
        padding: "8px 16px",
        backgroundColor: syncCode ? "#4CAF50" : "#f0f0f0",
        color: syncCode ? "white" : "#333",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px"
      }}>
        🔄 {syncCode ? `Sync: ${syncCode}` : "Enable Sync"}
      </button>

      <button onClick={() => setShowSavedTrips(!showSavedTrips)} style={{
        padding: "8px 16px",
        backgroundColor: showSavedTrips ? "#666" : "#f0f0f0",
        color: showSavedTrips ? "white" : "#333",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px"
      }}>
        📁 My Trips ({savedTrips.length})
      </button>

      {tripDays.length > 0 && (
        <>
          <button onClick={saveTrip} style={{
            padding: "8px 16px",
            backgroundColor: "#f0f0f0",
            color: "#333",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            💾 Save
          </button>
          <button onClick={shareTrip} style={{
            padding: "8px 16px",
            backgroundColor: "#f0f0f0",
            color: "#333",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            🔗 Share
          </button>
          <button onClick={exportTrip} style={{
            padding: "8px 16px",
            backgroundColor: "#f0f0f0",
            color: "#333",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            📄 Export
          </button>
        </>
      )}

      {shareMessage && (
        <span style={{ color: "#4CAF50", alignSelf: "center", fontWeight: "500" }}>
          ✓ {shareMessage}
        </span>
      )}
    </div>

    {/* Saved Trips Panel */}
    {showSavedTrips && (
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#333" }}>Saved Trips</h3>
        {savedTrips.length === 0 ? (
          <p style={{ color: "#666" }}>No saved trips yet. Plan a trip and save it!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {savedTrips.map(trip => (
              <div key={trip.id} style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px"
              }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => loadTrip(trip)}>
                  <div style={{ fontWeight: "600", color: "#333" }}>{trip.summary}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {new Date(trip.savedAt).toLocaleDateString()} • {trip.days.length} days
                  </div>
                </div>
                <button onClick={() => deleteTrip(trip.id)} style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px"
                }}>
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
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          width: "90%",
          maxWidth: "400px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ margin: 0 }}>🔄 Sync Favorites</h3>
            <button
              onClick={() => setShowSyncModal(false)}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
            >×</button>
          </div>

          {syncCode ? (
            <div>
              <p style={{ color: "#666", marginBottom: "15px" }}>
                Your sync code is:
              </p>
              <div style={{
                fontSize: "32px",
                fontWeight: "bold",
                textAlign: "center",
                padding: "20px",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                letterSpacing: "4px",
                marginBottom: "15px"
              }}>
                {syncCode}
              </div>
              <p style={{ color: "#888", fontSize: "14px", textAlign: "center" }}>
                Enter this code on another device to sync your favorites
              </p>
              <button
                onClick={() => {
                  setSyncCode("")
                  localStorage.removeItem("syncCode")
                  setFavorites([])
                }}
                style={{
                  width: "100%",
                  marginTop: "15px",
                  padding: "10px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Sync your favorites across devices. Create a new code or enter an existing one.
              </p>

              <button
                onClick={createSyncCode}
                disabled={syncLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  marginBottom: "20px"
                }}
              >
                {syncLoading ? "Creating..." : "Create New Sync Code"}
              </button>

              <div style={{ textAlign: "center", color: "#888", marginBottom: "15px" }}>
                — or enter existing code —
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  style={{
                    flex: 1,
                    padding: "12px",
                    fontSize: "18px",
                    textAlign: "center",
                    letterSpacing: "4px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    textTransform: "uppercase"
                  }}
                />
                <button
                  onClick={useSyncCode}
                  disabled={syncInput.length < 6}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: syncInput.length >= 6 ? "#2196F3" : "#ccc",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: syncInput.length >= 6 ? "pointer" : "default"
                  }}
                >
                  Use
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {loading && (
      <p style={{ textAlign: "center", color: "#333" }}>
        🔄 {mode === "plan" ? "Planning your trip..." : "Searching..."}
      </p>
    )}

    {error && <p style={{ textAlign: "center", color: "red"}}>{error}</p>}

    {/* Trip Summary */}
    {tripSummary && (
      <div style={{
        backgroundColor: "#e3f2fd",
        padding: "15px 20px",
        borderRadius: "8px",
        marginBottom: "20px",
        textAlign: "center"
      }}>
        <strong style={{ color: "#1976d2" }}>📍 {tripSummary}</strong>
        {routeInfo && (
          <div style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
            🚗 {Math.round(routeInfo.distance / 1609.34)} miles total
            &nbsp;•&nbsp;
            ⏱️ {Math.floor(routeInfo.duration / 3600)}h {Math.round((routeInfo.duration % 3600) / 60)}m driving time
          </div>
        )}
      </div>
    )}

    {/* Selected Place Detail */}
    {selectedPlace && (
      <div style={{
        border: "2px solid #4CAF50",
        padding: "20px",
        margin: "20px 0",
        backgroundColor: "white",
        borderRadius: "8px",
        color: "#333",
        display: "flex",
        gap: "20px"
      }}>
        {selectedPlace.place.photo_url && (
          <img
            src={selectedPlace.place.photo_url}
            alt={selectedPlace.place.name}
            style={{
              width: "200px",
              height: "150px",
              objectFit: "cover",
              borderRadius: "8px"
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>{selectedPlace.place.name}</h2>
          <p>📍 {selectedPlace.place.address}</p>
          {selectedPlace.place.rating && (
            <p>⭐ {selectedPlace.place.rating} ({selectedPlace.place.rating_count} reviews)</p>
          )}
          <p>🏷️ {selectedPlace.place.category}</p>
          {selectedPlace.place.why && <p>💡 {selectedPlace.place.why}</p>}
          <button onClick={() => setSelectedPlace(null)} style={{
            padding: "8px 16px",
            backgroundColor: "#666",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      </div>
    )}

    {/* Add Custom Stop Modal */}
    {showAddStop && (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "20px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflow: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Add Stop to Day {addStopDay + 1}</h3>
            <button
              onClick={() => { setShowAddStop(false); setCustomStopResults([]) }}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
            >×</button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input
              value={customStopQuery}
              onChange={(e) => setCustomStopQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCustomStop()}
              placeholder="Search for a place..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc"
              }}
            />
            <button
              onClick={searchCustomStop}
              disabled={searchingCustom}
              style={{
                padding: "10px 20px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              {searchingCustom ? "..." : "Search"}
            </button>
          </div>

          {customStopResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {customStopResults.map(place => (
                <div
                  key={place.place_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "8px",
                    gap: "10px"
                  }}
                >
                  {place.photo_url && (
                    <img
                      src={place.photo_url}
                      alt={place.name}
                      style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600" }}>{place.name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{place.address}</div>
                    {place.rating && <div style={{ fontSize: "12px" }}>⭐ {place.rating}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => addCustomStop(place, "food")}
                      style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                      title="Add as food"
                    >🍽️</button>
                    <button
                      onClick={() => addCustomStop(place, "attraction")}
                      style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                      title="Add as attraction"
                    >🏛️</button>
                    <button
                      onClick={() => addCustomStop(place, "activity")}
                      style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                      title="Add as activity"
                    >🎯</button>
                    <button
                      onClick={() => addCustomStop(place, "hotel")}
                      style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd", cursor: "pointer" }}
                      title="Add as hotel"
                    >🏨</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    <div className="content-layout" style={{ display: "flex", gap: "20px" }}>
      {/* Left Panel */}
      <div className="itinerary-panel" style={{ flex: 1, maxHeight: "700px", overflowY: "auto" }}>
        {mode === "plan" && tripDays.length > 0 ? (
          tripDays.map((day, dayIndex) => (
            <div key={`day-${day.day}`} style={{
              marginBottom: "20px",
              backgroundColor: "white",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                backgroundColor: "#2196F3",
                color: "white",
                padding: "12px 16px",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>Day {day.day}: {day.date_label}</span>
                <button
                  onClick={() => { setAddStopDay(dayIndex); setShowAddStop(true) }}
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  + Add Stop
                </button>
              </div>

              <div style={{ padding: "8px" }}>
                {day.activities.map((activity, idx) => (
                  <div
                    key={`${day.day}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      borderBottom: idx < day.activities.length - 1 ? "1px solid #eee" : "none",
                      cursor: activity.place ? "pointer" : "default",
                      backgroundColor: activity.place ? "#fafafa" : "transparent",
                      borderRadius: "8px",
                      margin: "4px 0"
                    }}
                    onClick={() => activity.place && setSelectedPlace({ place: activity.place })}
                  >
                    <div style={{ fontSize: "24px", marginRight: "12px", minWidth: "32px" }}>
                      {activityIcons[activity.activity_type] || '📍'}
                    </div>

                    {/* Photo */}
                    {activity.place?.photo_url && (
                      <img
                        src={activity.place.photo_url}
                        alt={activity.place.name}
                        style={{
                          width: "80px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          marginRight: "12px"
                        }}
                      />
                    )}

                    <div style={{ flex: 1 }}>
                      {activity.place ? (
                        <>
                          <div style={{ fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                            {activity.place.name}
                          </div>
                          <div style={{ fontSize: "13px", color: "#666" }}>
                            {activity.description}
                          </div>
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                            📍 {activity.place.address}
                            {activity.place.rating && (
                              <span style={{ marginLeft: "10px" }}>⭐ {activity.place.rating}</span>
                            )}
                            {activity.place.price_level && (
                              <span style={{ marginLeft: "10px", color: "#4CAF50" }}>
                                {priceLevels[activity.place.price_level]}
                              </span>
                            )}
                          </div>
                          {/* Booking & Map Links */}
                          <div style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <a
                              href={getPlaceLinks(activity.place).googleMaps}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: "11px",
                                color: "#1a73e8",
                                textDecoration: "none",
                                padding: "3px 8px",
                                backgroundColor: "#e8f0fe",
                                borderRadius: "4px"
                              }}
                            >
                              📍 Map
                            </a>
                            <a
                              href={getPlaceLinks(activity.place).googleDirections}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: "11px",
                                color: "#1a73e8",
                                textDecoration: "none",
                                padding: "3px 8px",
                                backgroundColor: "#e8f0fe",
                                borderRadius: "4px"
                              }}
                            >
                              🚗 Directions
                            </a>
                            {(activity.activity_type === "food" || activity.activity_type === "hotel") && (
                              <a
                                href={getPlaceLinks(activity.place).bookGoogle}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: "11px",
                                  color: "#fff",
                                  textDecoration: "none",
                                  padding: "3px 8px",
                                  backgroundColor: "#4CAF50",
                                  borderRadius: "4px"
                                }}
                              >
                                📅 Book
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{
                          color: "#555",
                          fontStyle: activity.activity_type === "drive" ? "italic" : "normal"
                        }}>
                          {activity.description}
                        </div>
                      )}
                    </div>

                    {/* Reorder buttons */}
                    <div style={{ display: "flex", flexDirection: "column", marginLeft: "8px", gap: "2px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveActivity(dayIndex, idx, -1) }}
                        disabled={idx === 0}
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          cursor: idx === 0 ? "default" : "pointer",
                          opacity: idx === 0 ? 0.3 : 1,
                          border: "1px solid #ddd",
                          borderRadius: "3px",
                          backgroundColor: "#fff"
                        }}
                      >▲</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveActivity(dayIndex, idx, 1) }}
                        disabled={idx === day.activities.length - 1}
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          cursor: idx === day.activities.length - 1 ? "default" : "pointer",
                          opacity: idx === day.activities.length - 1 ? 0.3 : 1,
                          border: "1px solid #ddd",
                          borderRadius: "3px",
                          backgroundColor: "#fff"
                        }}
                      >▼</button>
                    </div>

                    {activity.place && (
                      <span
                        style={{ fontSize: "18px", cursor: "pointer", marginLeft: "8px" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(activity.place.place_id, activity.place)
                        }}
                      >
                        {favorites.includes(activity.place.place_id) ? "❤️" : "🤍"}
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeActivity(dayIndex, idx) }}
                      style={{
                        marginLeft: "8px",
                        padding: "4px 8px",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        opacity: 0.5
                      }}
                      title="Remove"
                    >🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            {results.length > 0 && (
              <p style={{ color: "#666", marginBottom: "10px" }}>
                Showing {results.length} places
              </p>
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
      <div className="map-panel" style={{ flex: 2, minWidth: 0 }}>
        {tripDays.length > 1 && (
          <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
            <button
              onClick={() => setMapView("daily")}
              style={{
                padding: "8px 16px",
                backgroundColor: mapView === "daily" ? "#2196F3" : "#f0f0f0",
                color: mapView === "daily" ? "white" : "#333",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Day-by-Day
            </button>
            <button
              onClick={() => setMapView("fullTrip")}
              style={{
                padding: "8px 16px",
                backgroundColor: mapView === "fullTrip" ? "#2196F3" : "#f0f0f0",
                color: mapView === "fullTrip" ? "white" : "#333",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              🗺️ Full Trip Route
            </button>
          </div>
        )}
        <Map results={results} tripDays={tripDays} onSelectPlace={setSelectedPlace} onRouteInfo={setRouteInfo} mapView={mapView} />
      </div>
    </div>
  </div>
)
}

export default App
