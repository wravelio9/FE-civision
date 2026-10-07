import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapView() {
    const position = [-6.2018, 106.7829];

    return (
        <MapContainer
            center={position}
            zoom={15}
            style={{ height: '500px', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={position}>
                <Popup>
                    Lokasi pelanggaran PKL
                </Popup>
            </Marker>
        </MapContainer>
    );
}

export default MapView;