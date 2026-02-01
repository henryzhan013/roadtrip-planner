import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in webpack/vite
// Leaflet's default icons don't load correctly with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for selected marker
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Component to fit map bounds to markers.
 */
function FitBounds({ places }) {
  const map = useMap();

  useEffect(() => {
    if (places && places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, map]);

  return null;
}

/**
 * Component to pan to selected marker.
 */
function PanToSelected({ selectedPlace }) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.panTo([selectedPlace.lat, selectedPlace.lng], { animate: true });
    }
  }, [selectedPlace, map]);

  return null;
}

/**
 * Map component showing place markers.
 *
 * Props:
 * - places: array of place objects with lat, lng
 * - selectedId: string - currently selected place_id
 * - onSelect: function(placeId) - called when marker is clicked
 */
export default function Map({ places, selectedId, onSelect }) {
  // Find selected place for panning
  const selectedPlace = places?.find((p) => p.place_id === selectedId);

  // Default center: center of USA
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {places && places.length > 0 && <FitBounds places={places} />}
      {selectedPlace && <PanToSelected selectedPlace={selectedPlace} />}

      {places?.map((place) => (
        <Marker
          key={place.place_id}
          position={[place.lat, place.lng]}
          icon={place.place_id === selectedId ? selectedIcon : defaultIcon}
          eventHandlers={{
            click: () => onSelect(place.place_id),
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{place.name}</strong>
              {place.rating && (
                <div className="text-amber-600">★ {place.rating}</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
