"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

type LiveDriverMapProps = {
  driverLat: number;
  driverLng: number;
};

const driverIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);

  return null;
}

export default function LiveDriverMap({
  driverLat,
  driverLng,
}: LiveDriverMapProps) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <MapContainer
        center={[driverLat, driverLng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-72 w-full"
      >
        <RecenterMap lat={driverLat} lng={driverLng} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[driverLat, driverLng]} icon={driverIcon}>
          <Popup>Bezorger is hier</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}