import { MapContainer, TileLayer, Marker, Popup, useMap} from 'react-leaflet'

function ChangeView({center}){
    const map = useMap()
    map.setView(center, 13)
    return null
}

function Map(props){
    let center = [36.16, -86.78]

    if (props.results.length > 0){
        center = [
            props.results[0].place.lat,
            props.results[0].place.lng
        ]
    }
    return (
       <MapContainer 
            center={center} 
            zoom={13} 
            style={{ height: "600px", width: "100%", minWidth: "100%" }}
        >
            <ChangeView center={center} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {props.results.map((result) => (
                <Marker
                    key={result.place.place_id}
                    position={[result.place.lat, result.place.lng]}
                    eventHandlers={{
                        click: () => props.onSelectedPlace(result)
                    }}
                >
                    <Popup> {result.place.name}</Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}

export default Map