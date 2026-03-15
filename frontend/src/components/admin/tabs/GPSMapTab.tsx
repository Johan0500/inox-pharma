import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../services/api";
import { GPSPosition, DelegateStatus } from "../../../types";
import "leaflet/dist/leaflet.css";
// Fix icônes Leaflet avec Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLORS: Record<DelegateStatus, string> = {
  EN_VISITE:      "#00A86B",
  EN_DEPLACEMENT: "#0066CC",
  EN_PAUSE:       "#F59E0B",
  INACTIF:        "#9CA3AF",
};

const STATUS_LABELS: Record<DelegateStatus, string> = {
  EN_VISITE:      "En visite",
  EN_DEPLACEMENT: "En déplacement",
  EN_PAUSE:       "En pause",
  INACTIF:        "Inactif",
};

function createIcon(status: DelegateStatus, name: string) {
  const color = STATUS_COLORS[status] || "#9CA3AF";
  const short = name.split(" ")[0];
  return L.divIcon({
    html: `
      <div style="
        background:${color};color:white;
        padding:4px 10px;border-radius:20px;
        font-size:11px;font-weight:700;
        white-space:nowrap;
        box-shadow:0 3px 8px rgba(0,0,0,0.35);
        border:2px solid rgba(255,255,255,0.8);
        font-family:system-ui,sans-serif;
      ">📍 ${short}</div>`,
    className: "",
    iconAnchor: [0, 0],
  });
}

export default function GPSMapTab() {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Record<string, GPSPosition>>({});
  const [filterZone,   setFilterZone]   = useState("");
  const [filterStatus, setFilterStatus] = useState<DelegateStatus | "">("");

  // Charger les dernières positions depuis l'API
  const { data: initialPositions } = useQuery({
    queryKey: ["gps-positions"],
    queryFn:  () => api.get("/gps/positions").then((r) => r.data),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!initialPositions) return;
    const map: Record<string, GPSPosition> = {};
    initialPositions.forEach((p: any) => {
      if (p.lat && p.lng) {
        map[p.id] = {
          delegateId: p.id,
          name:       p.name,
          zone:       p.zone,
          status:     p.status,
          latitude:   p.lat,
          longitude:  p.lng,
          timestamp:  p.lastSeen,
        };
      }
    });
    setPositions(map);
  }, [initialPositions]);

  // Socket.io — mises à jour temps réel
  useEffect(() => {
    if (!token) return;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      { auth: { token } }
    );

    socket.on("delegate_location_update", (data: GPSPosition) => {
      setPositions((prev) => ({ ...prev, [data.delegateId]: data }));
    });

    socket.on("delegate_offline", ({ delegateId }: { delegateId: string }) => {
      setPositions((prev) =>
        prev[delegateId]
          ? { ...prev, [delegateId]: { ...prev[delegateId], status: "INACTIF" } }
          : prev
      );
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const allPositions = Object.values(positions);

  const filtered = allPositions.filter((p) => {
    if (filterZone   && !p.zone?.toLowerCase().includes(filterZone.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return p.latitude && p.longitude;
  });

  const counts = allPositions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">GPS — Suivi Temps Réel</h2>

      {/* Compteurs */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(STATUS_COLORS) as [DelegateStatus, string][]).map(([status, color]) => (
          <div key={status} className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100 flex items-center gap-2">
            <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block" />
            <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status]}</span>
            <span className="text-sm text-gray-400">({counts[status] || 0})</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3 flex-wrap items-center">
        <input
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Filtrer par zone..."
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="EN_VISITE">🟢 En visite</option>
          <option value="EN_DEPLACEMENT">🔵 En déplacement</option>
          <option value="EN_PAUSE">🟡 En pause</option>
          <option value="INACTIF">⚫ Inactif</option>
        </select>
        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} délégué(s) affiché(s) / {allPositions.length} total
        </span>
        {allPositions.length === 0 && (
          <span className="text-xs text-orange-500">
            ⚠️ Aucune position — les délégués doivent activer leur GPS
          </span>
        )}
      </div>

      {/* Carte Leaflet */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <MapContainer
          center={[5.354, -4.008]}
          zoom={12}
          style={{ height: "530px", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          />
          {filtered.map((p) => (
            <Marker
              key={p.delegateId}
              position={[p.latitude, p.longitude]}
              icon={createIcon(p.status, p.name)}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-bold text-gray-800 mb-1">{p.name}</p>
                  <p className="text-gray-500 text-xs">Zone : {p.zone}</p>
                  <p style={{ color: STATUS_COLORS[p.status] }} className="font-semibold text-xs mt-1">
                    ● {STATUS_LABELS[p.status]}
                  </p>
                  {p.timestamp && (
                    <p className="text-gray-400 text-xs mt-1">
                      Mis à jour : {new Date(p.timestamp).toLocaleTimeString("fr-FR")}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
