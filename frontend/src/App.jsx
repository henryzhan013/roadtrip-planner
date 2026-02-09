import { useState, useEffect } from 'react'
import Placecard from './PlaceCard'
import 'leaflet/dist/leaflet.css'
import Map from './Map'

function App(){
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [totalPlaces, setTotalPlaces] = useState(0)
  const [error, setError] = useState("")
  const [filterHighRated, setFilterHighRated] = useState(false)
  const [favorites, setFavorites] = useState([])


  useEffect(() => {
    const loadPlaces = async () => {
      const response = await fetch('http://localhost:8000/places')
      const data = await response.json()
      console.log("All places:", data)
      setTotalPlaces(data.total)
    }
    const savedFavorites = localStorage.getItem("favorites")
    if (savedFavorites){
      setFavorites(JSON.parse(savedFavorites))
    }
    loadPlaces()
  }, [])

  const handleSearch = async() => {
    setLoading(true)
    setError("")

    try{
      const response = await fetch(`http://localhost:8000/search?query=${query}`)
      const data = await response.json()
      setResults(data.results)
    } catch(err){
      setError("Could not connect to server. Is the backend running?")
      console.log("Search error:", err)
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

  const filteredResults = filterHighRated
    ? results.filter(result => result.place.rating >= 4)
    : results
  

  return (
  <div style={{ 
    padding: "20px", 
    backgroundColor: "#f5f5f5",
    minHeight: "100vh"
  }}>
    <h1 style={{ textAlign: "center", color: "#333" }}>🚗 Road Trip Planner</h1>
    
    {totalPlaces > 0 && (
      <p style={{ textAlign: "center", color: "#666", marginBottom: "20px"}}>
        Explore {totalPlaces} places in our database
      </p>
    )}
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key == "Enter"){
            handleSearch()
          }
        }}
        placeholder="Enter a vibe... (e.g. chill honky tonk)"
        style={{ 
          padding: "12px", 
          width: "350px", 
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
          fontSize: "16px"
        }}
      >
        Search
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
    </div>

    {loading && <p style={{ textAlign: "center", color: "#333" }}>Searching...</p>}

    {error && <p style={{ textAlign: "center", color: "red"}}>{error}</p>}
    <p style={{ color: "#666", marginBottom: "10px" }}>
      Showing {filteredResults.length} of {results.length} places
    </p>

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
        <p>⭐ {selectedPlace.place.rating} ({selectedPlace.place.rating_count} reviews)</p>
        <p>🏷️ {selectedPlace.place.category}</p>
        <p>Match: {selectedPlace.score_percentage}</p>
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
        {filteredResults.map((result, index) => (
          <Placecard
            key={result.place.place_id}
            name={result.place.name}
            score={result.score_percentage}
            rank={index + 1}
            onClick={() => setSelectedPlace(result)}
            isFavorite = {favorites.includes(result.place.place_id)}
            onToggleFavorite = {() => toggleFavorite(result.place.place_id)}
          />
        ))}
      </div>
      <div style={{ flex: 2, minWidth: 0 }}>
        <Map results={results} onSelectPlace={setSelectedPlace} />
      </div>
    </div>
  </div>
)
}

export default App