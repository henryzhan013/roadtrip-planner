import { useState } from 'react'
import Placecard from './PlaceCard'

function App(){
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

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
    <div>
      <h1> Road Trip Planner</h1>
      <div> <input value = {query} onChange = {(e) => setQuery(e.target.value)}/>
      <button onClick = {handleSearch}>Search</button></div>
      {loading && <p>Searching...</p>}
      <div>
        {results.map((result) => (
          <Placecard
           key = {result.place.place_id}
           name = {result.place.name}
           score = {result.score_percentage}
          />
        ))}
      </div>
    </div>
  )
}

export default App