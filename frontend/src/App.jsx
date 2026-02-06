import { useState } from 'react'
import Placecard from './PlaceCard'
import 'leaflet/dist/leaflet.css'
import Map from './Map'

function App(){
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)

  const handleSearch = async() => {
    setLoading(true)
    const response = await fetch(`http://localhost:8000/search?query=${query}`)
    const data = await response.json()
    console.log("data:", data)
    console.log("data.results:", data.results)
    setResults(data.results)
    setLoading(false)
  }

  return (
<div style={{ 
  padding: "20px", 
  backgroundColor: "#f5f5f5",
  minHeight: "100vh"
}}>
    <h1 style={{ textAlign: "center", color: "#333" }}>🚗 Road Trip Planner</h1>
    
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
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

    {loading && <p style={{ textAlign: "center", color: "#333" }}>Searching...</p>}

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
        {results.map((result, index) => (
          <Placecard
            key={result.place.place_id}
            name={result.place.name}
            score={result.score_percentage}
            rank={index + 1}
            onClick={() => setSelectedPlace(result)}
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