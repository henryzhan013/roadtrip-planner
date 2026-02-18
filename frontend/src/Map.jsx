import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'

// Create numbered marker icon
function createNumberedIcon(number, color = '#2196F3') {
    return L.divIcon({
        className: 'numbered-marker',
        html: `<div style="
            background-color: ${color};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">${number}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    })
}

// Day colors
const dayColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548']

// Decode polyline from OSRM
function decodePolyline(encoded) {
    const poly = []
    let index = 0
    let lat = 0
    let lng = 0

    while (index < encoded.length) {
        let b, shift = 0, result = 0

        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lat += dlat

        shift = 0
        result = 0

        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lng += dlng

        poly.push([lat / 1e5, lng / 1e5])
    }

    return poly
}

// Fit map to show all markers
function FitBounds({ positions }) {
    const map = useMap()

    useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.map(p => [p.lat, p.lng])
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [positions, map])

    return null
}

function Map({ results, tripDays, onSelectPlace, onRouteInfo }) {
    const [routeGeometry, setRouteGeometry] = useState([])
    const [routeLoading, setRouteLoading] = useState(false)
    const defaultCenter = [30.27, -97.74] // Austin, TX

    // Get all positions for bounds fitting
    const allPositions = results
        .filter(r => r.place)
        .map(r => ({ lat: r.place.lat, lng: r.place.lng }))

    // Build waypoints from tripDays
    const waypoints = []
    if (tripDays && tripDays.length > 0) {
        tripDays.forEach(day => {
            const placesWithLocation = day.activities
                .filter(act => act.place && act.place.lat && act.place.lng)

            if (placesWithLocation.length > 0) {
                const avgLat = placesWithLocation.reduce((sum, act) => sum + act.place.lat, 0) / placesWithLocation.length
                const avgLng = placesWithLocation.reduce((sum, act) => sum + act.place.lng, 0) / placesWithLocation.length
                waypoints.push({ lat: avgLat, lng: avgLng })
            }
        })
    }

    // Fetch real driving route from OSRM
    useEffect(() => {
        if (waypoints.length < 2) {
            setRouteGeometry([])
            onRouteInfo && onRouteInfo(null)
            return
        }

        const fetchRoute = async () => {
            setRouteLoading(true)
            try {
                const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';')
                const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`

                const response = await fetch(url)
                const data = await response.json()

                if (data.code === 'Ok' && data.routes && data.routes[0]) {
                    const route = data.routes[0]
                    const decoded = decodePolyline(route.geometry)
                    setRouteGeometry(decoded)

                    // Send route info back to parent
                    onRouteInfo && onRouteInfo({
                        distance: route.distance, // meters
                        duration: route.duration  // seconds
                    })
                } else {
                    setRouteGeometry(waypoints.map(w => [w.lat, w.lng]))
                    onRouteInfo && onRouteInfo(null)
                }
            } catch (err) {
                console.log('Route fetch error:', err)
                setRouteGeometry(waypoints.map(w => [w.lat, w.lng]))
                onRouteInfo && onRouteInfo(null)
            }
            setRouteLoading(false)
        }

        fetchRoute()
    }, [JSON.stringify(waypoints)])

    let globalIndex = 0

    return (
        <MapContainer
            center={defaultCenter}
            zoom={6}
            style={{ height: "700px", width: "100%", minWidth: "100%" }}
        >
            {allPositions.length > 0 && <FitBounds positions={allPositions} />}

            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {routeGeometry.length > 1 && (
                <Polyline
                    positions={routeGeometry}
                    color="#2196F3"
                    weight={4}
                    opacity={0.8}
                />
            )}

            {routeLoading && waypoints.length > 1 && (
                <Polyline
                    positions={waypoints.map(w => [w.lat, w.lng])}
                    color="#ccc"
                    weight={3}
                    opacity={0.5}
                    dashArray="5, 10"
                />
            )}

            {tripDays && tripDays.length > 0 ? (
                tripDays.map((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length]
                    return day.activities
                        .filter(act => act.place && act.place.lat && act.place.lng)
                        .map((activity) => {
                            globalIndex++
                            return (
                                <Marker
                                    key={`${day.day}-${activity.place.place_id}`}
                                    position={[activity.place.lat, activity.place.lng]}
                                    icon={createNumberedIcon(globalIndex, dayColor)}
                                    eventHandlers={{
                                        click: () => onSelectPlace({ place: activity.place })
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '200px' }}>
                                            <strong style={{ color: dayColor }}>{day.date_label}</strong><br />
                                            <strong>{activity.place.name}</strong><br />
                                            <em style={{ color: '#666' }}>{activity.description}</em>
                                            {activity.place.rating && (
                                                <div style={{ marginTop: '5px' }}>⭐ {activity.place.rating}</div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        })
                })
            ) : (
                results.map((result, index) => (
                    <Marker
                        key={result.place.place_id}
                        position={[result.place.lat, result.place.lng]}
                        icon={createNumberedIcon(index + 1)}
                        eventHandlers={{
                            click: () => onSelectPlace(result)
                        }}
                    >
                        <Popup>{result.place.name}</Popup>
                    </Marker>
                ))
            )}
        </MapContainer>
    )
}

export default Map
