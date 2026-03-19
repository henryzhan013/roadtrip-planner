import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import type { DayPlan, Place, RouteInfo, MapView } from '../../types';

interface MapProps {
  results: Array<{ place: Place; day?: number; activity_type?: string }>;
  tripDays: DayPlan[];
  onSelectPlace: (data: { place: Place }) => void;
  onRouteInfo: (info: RouteInfo | null) => void;
  mapView?: MapView;
}

interface Position {
  lat: number;
  lng: number;
}

// Helper to darken/lighten colors
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Create numbered marker icon with modern styling
function createNumberedIcon(number: number, color = '#6366f1'): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker-container',
    html: `<div style="
      background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      font-family: 'Inter', -apple-system, sans-serif;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s ease;
    ">${number}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

// Day colors - matching the design system
const dayColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

// Decode polyline from OSRM
function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

// Fit map to show all markers
function FitBounds({ positions }: { positions: Position[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds: [number, number][] = positions.map((p) => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

export function Map({ results, tripDays, onSelectPlace, onRouteInfo, mapView = 'daily' }: MapProps) {
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const defaultCenter: [number, number] = [30.27, -97.74]; // Austin, TX

  // Get all positions for bounds fitting
  const allPositions = results
    .filter((r) => r.place)
    .map((r) => ({ lat: r.place.lat, lng: r.place.lng }));

  // Build waypoints based on map view mode
  const waypoints: Position[] = [];
  if (tripDays && tripDays.length > 0) {
    if (mapView === 'fullTrip') {
      // Full trip: ALL stops in sequence
      tripDays.forEach((day) => {
        day.activities
          .filter((act) => act.place && act.place.lat && act.place.lng)
          .forEach((act) => {
            if (act.place) {
              waypoints.push({ lat: act.place.lat, lng: act.place.lng });
            }
          });
      });
    } else {
      // Daily view: centroid per day
      tripDays.forEach((day) => {
        const placesWithLocation = day.activities.filter(
          (act) => act.place && act.place.lat && act.place.lng
        );

        if (placesWithLocation.length > 0) {
          const avgLat =
            placesWithLocation.reduce((sum, act) => sum + (act.place?.lat || 0), 0) /
            placesWithLocation.length;
          const avgLng =
            placesWithLocation.reduce((sum, act) => sum + (act.place?.lng || 0), 0) /
            placesWithLocation.length;
          waypoints.push({ lat: avgLat, lng: avgLng });
        }
      });
    }
  }

  // Fetch real driving route from OSRM
  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteGeometry([]);
      onRouteInfo?.(null);
      return;
    }

    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const decoded = decodePolyline(route.geometry);
          setRouteGeometry(decoded);

          // Send route info back to parent
          onRouteInfo?.({
            distance: route.distance,
            duration: route.duration,
            polyline: route.geometry,
          });
        } else {
          setRouteGeometry(waypoints.map((w) => [w.lat, w.lng]));
          onRouteInfo?.(null);
        }
      } catch (err) {
        console.log('Route fetch error:', err);
        setRouteGeometry(waypoints.map((w) => [w.lat, w.lng]));
        onRouteInfo?.(null);
      }
      setRouteLoading(false);
    };

    fetchRoute();
  }, [JSON.stringify(waypoints), mapView]);

  let globalIndex = 0;

  return (
    <MapContainer center={defaultCenter} zoom={6} style={{ height: '700px', width: '100%', minWidth: '100%' }}>
      {allPositions.length > 0 && <FitBounds positions={allPositions} />}

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {routeGeometry.length > 1 && (
        <Polyline
          positions={routeGeometry}
          color={mapView === 'fullTrip' ? '#6366f1' : '#10b981'}
          weight={mapView === 'fullTrip' ? 5 : 4}
          opacity={0.85}
        />
      )}

      {routeLoading && waypoints.length > 1 && (
        <Polyline
          positions={waypoints.map((w) => [w.lat, w.lng] as [number, number])}
          color="#ccc"
          weight={3}
          opacity={0.5}
          dashArray="5, 10"
        />
      )}

      {tripDays && tripDays.length > 0
        ? tripDays.map((day, dayIndex) => {
            const dayColor = dayColors[dayIndex % dayColors.length];
            return day.activities
              .filter((act) => act.place && act.place.lat && act.place.lng)
              .map((activity) => {
                globalIndex++;
                if (!activity.place) return null;
                return (
                  <Marker
                    key={`${day.day}-${activity.place.place_id}`}
                    position={[activity.place.lat, activity.place.lng]}
                    icon={createNumberedIcon(globalIndex, dayColor)}
                    eventHandlers={{
                      click: () => onSelectPlace({ place: activity.place! }),
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '220px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: dayColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '6px',
                          }}
                        >
                          {day.date_label}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                          {activity.place.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                          {activity.description}
                        </div>
                        {activity.place.rating && (
                          <div style={{ fontSize: '13px', color: '#4b5563' }}>⭐ {activity.place.rating}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              });
          })
        : results.map((result, index) => (
            <Marker
              key={result.place.place_id}
              position={[result.place.lat, result.place.lng]}
              icon={createNumberedIcon(index + 1)}
              eventHandlers={{
                click: () => onSelectPlace(result),
              }}
            >
              <Popup>
                <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: '600', color: '#1f2937' }}>
                  {result.place.name}
                </div>
              </Popup>
            </Marker>
          ))}
    </MapContainer>
  );
}
