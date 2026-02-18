import { useState } from 'react'
import Placecard from './PlaceCard'
import 'leaflet/dist/leaflet.css'
import Map from './Map'

function App(){
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [tripStops, setTripStops] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [error, setError] = useState("")
  const [filterHighRated, setFilterHighRated] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites")
    return saved ? JSON.parse(saved) : []
  })
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [mode, setMode] = useState("search") // "search" or "plan"

  const handleSearch = async() => {
    setLoading(true)
    setError("")
    setTripStops([])

    try{
      const response = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results.map(place => ({ place })))
      setMode("search")
    } catch(err){
      setError("Could not connect to server. Is the backend running?")
      console.log("Search error:", err)
    }

    setLoading(false)
  }

  const handlePlanTrip = async() => {
    setLoading(true)
    setError("")
    setResults([])

    try{
      const response = await fetch('http://localhost:8000/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to plan trip')
      }

      const data = await response.json()
      setTripStops(data.stops)

      // Flatten all places for the map
      const allPlaces = data.stops.flatMap(stop =>
        stop.places.map(place => ({ place }))
      )
      setResults(allPlaces)
      setMode("plan")
    } catch(err){
      setError(err.message || "Could not plan trip. Is the backend running?")
      console.log("Plan error:", err)
    }

    setLoading(false)
  }

  const toggleFavorite = (placeId) => {
    let newFavorites
    if(favorites.includes(placeId)){
      newFavorites = favorites.filter(id => id !== placeId)
    }else{
      newFavorites = [...favorites, placeId]
    }
    setFavorites(newFavorites)
    localStorage.setItem("favorites",JSON.stringify(newFavorites))
  }

  const filteredResults = results
    .filter(result => !filterHighRated || (result.place.rating && result.place.rating >= 4))
    .filter(result => !showFavoritesOnly || favorites.includes(result.place.place_id))


  return (
  <div style={{
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh"
  }}>
    <h1 style={{ textAlign: "center", color: "#333" }}>🚗 Road Trip Planner</h1>

    <p style={{ textAlign: "center", color: "#666", marginBottom: "20px"}}>
      Search for places or plan a multi-day road trip
    </p>

    <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key == "Enter"){
            handleSearch()
          }
        }}
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
      <button
        onClick={handleSearch}
        style={{
          padding: "12px 24px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          marginRight: "10px"
        }}
      >
        Search
      </button>
      <button
        onClick={handlePlanTrip}
        style={{
          padding: "12px 24px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        Plan Trip
      </button>
    </div>

    <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
      <label style={{ color: "#333" }}>
        <input
          type="checkbox"
          checked={filterHighRated}
          onChange={(e) => setFilterHighRated(e.target.checked)}
        />
        {" "}Show only 4+ star places
      </label>
      <label style={{ color: "#333", marginLeft: "20px" }}>
        <input
          type="checkbox"
          checked={showFavoritesOnly}
          onChange={(e) => setShowFavoritesOnly(e.target.checked)}
        />
        {" "}Show favorites only
      </label>
    </div>

    {loading && <p style={{ textAlign: "center", color: "#333" }}>🔄 {mode === "plan" ? "Planning your trip..." : "Searching..."}</p>}

    {error && <p style={{ textAlign: "center", color: "red"}}>{error}</p>}

    {selectedPlace && (
      <div style={{
        border: "2px solid #4CAF50",
        padding: "20px",
        margin: "20px 0",
        backgroundColor: "white",
        borderRadius: "8px",
        color: "#333"
      }}>
        <h2>{selectedPlace.place.name}</h2>
        <p>📍 {selectedPlace.place.address}</p>
        {selectedPlace.place.rating && (
          <p>⭐ {selectedPlace.place.rating} ({selectedPlace.place.rating_count} reviews)</p>
        )}
        <p>🏷️ {selectedPlace.place.category}</p>
        {selectedPlace.place.why && (
          <p>💡 {selectedPlace.place.why}</p>
        )}
        <button
          onClick={() => setSelectedPlace(null)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#666",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </div>
    )}

    <div style={{ display: "flex", gap: "20px" }}>
      <div style={{ flex: 1, maxHeight: "600px", overflowY: "auto" }}>
        {mode === "plan" && tripStops.length > 0 ? (
          // Trip planning view - grouped by day
          tripStops.map((stop) => (
            <div key={`day-${stop.day}-${stop.city}`} style={{ marginBottom: "20px" }}>
              <h3 style={{
                color: "#2196F3",
                borderBottom: "2px solid #2196F3",
                paddingBottom: "8px",
                marginBottom: "10px"
              }}>
                Day {stop.day}: {stop.city}
              </h3>
              {stop.places
                .filter(place => !filterHighRated || (place.rating && place.rating >= 4))
                .filter(place => !showFavoritesOnly || favorites.includes(place.place_id))
                .map((place, index) => (
                <Placecard
                  key={place.place_id}
                  name={place.name}
                  rating={place.rating}
                  why={place.why}
                  rank={index + 1}
                  onClick={() => setSelectedPlace({ place })}
                  isFavorite={favorites.includes(place.place_id)}
                  onToggleFavorite={() => toggleFavorite(place.place_id)}
                />
              ))}
            </div>
          ))
        ) : (
          // Regular search view
          <>
            {results.length > 0 && (
              <p style={{ color: "#666", marginBottom: "10px" }}>
                Showing {filteredResults.length} of {results.length} places
              </p>
            )}
            {filteredResults.map((result, index) => (
              <Placecard
                key={result.place.place_id}
                name={result.place.name}
                rating={result.place.rating}
                rank={index + 1}
                onClick={() => setSelectedPlace(result)}
                isFavorite={favorites.includes(result.place.place_id)}
                onToggleFavorite={() => toggleFavorite(result.place.place_id)}
              />
            ))}
          </>
        )}
      </div>
      <div style={{ flex: 2, minWidth: 0 }}>
        <Map results={results} onSelectPlace={setSelectedPlace} />
      </div>
    </div>
  </div>
)
}

export default App
