import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix for default marker icons missing in Vite/React-Leaflet builds
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface FoodSpot {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
}

const SAMPLE_SPOTS: FoodSpot[] = [
  {
    id: "1",
    name: "Student Union Dining",
    category: "On-Campus",
    lat: 28.6024,
    lng: -81.2001,
    description: "Great variety of quick bites between classes.",
  },
  // Add more spots here
];

export default function FoodMap() {
  return (
    <div className="h-[600px] w-full overflow-hidden rounded-2xl shadow-md">
      <MapContainer
        center={[28.6024, -81.2001]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {SAMPLE_SPOTS.map((spot) => (
          <Marker key={spot.id} position={[spot.lat, spot.lng]}>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-[#3E1230]">{spot.name}</h3>
                <p className="text-xs text-gray-600">{spot.category}</p>
                <p className="mt-1 text-sm">{spot.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}