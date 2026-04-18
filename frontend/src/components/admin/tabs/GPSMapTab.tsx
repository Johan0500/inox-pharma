import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
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

// Palette de couleurs pour les trajets de chaque délégué
const TRAIL_COLORS = [
  "#0066CC", "#dc2626", "#7c3aed", "#d97706",
  "#059669", "#db2777", "#0891b2", "#92400e",
];

function createIcon(status: DelegateStatus, name: string) {
  const color = STATUS_COLORS[status] || "#9CA3AF";
  const short = name.split(" ")[0];
  return L.divIcon({
    html: `<div style="
      background:${color};color:white;
      padding:5px 12px;border-radius:20px;
      font-size:11px;font-weight:700;
      white-space:nowrap;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
      border:2px solid rgba(255,255,255,0.9);
      font-family:system-ui,sans-serif;
      display:flex;align-items:center;gap:4px;
    "><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.8);display:inline-block"></span>${short}</div>`,
    className: "",
    iconAnchor: [30, 15],
  });
}

interface TrailPoint { lat: number; lng: number; timestamp: string; status: string; }
type TrailMap = Record<string, TrailPoint[]>;

export default function GPSMapTab() {
  const { token } = useAuth();
  const [positions,    setPositions]    = useState<Record<string, GPSPosition>>({});
  const [trails,       setTrails]       = useState<TrailMap>({});
  const [filterZone,   setFilterZone]   = useState("");
  const [filterStatus, setFilterStatus] = useState<DelegateStatus | "">("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showTrails,   setShowTrails]   = useState(true);
  const colorIndexRef  = useRef<Record<string, number>>({});
  const colorCounter   = useRef(0);

  // Couleur unique par délégué
  const getDelegateColor = (delegateId: string): string => {
    if (colorIndexRef.current[delegateId] === undefined) {
      colorIndexRef.current[delegateId] = colorCounter.current % TRAIL_COLORS.length;
      colorCounter.current++;
    }
    return TRAIL_COLORS[colorIndexRef.current[delegateId]];
  };

  // Dernières positions depuis l'API
  const { data: initialPositions } = useQuery({
    queryKey: ["gps-positions"],
    queryFn:  () => api.get("/gps/positions").then((r) => r.data),
    refetchInterval: 30000,
  });

  // Historique des trajets du jour
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["gps-history", selectedDate],
    queryFn:  () => api.get("/gps/history", { params: { date: selectedDate } }).then(r => r.data),
    staleTime: 60000,
  });

  // Délégués pour le filtre
  const { data: delegates = [] } = useQuery({
    queryKey: ["delegates-list"],
    queryFn:  () => api.get("/delegates").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Initialiser les positions depuis l'API
  useEffect(() => {
    if (!initialPositions) return;
    const map: Record<string, GPSPosition> = {};
    (initialPositions as any[]).forEach((p: any) => {
      if (p.lat && p.lng) {
        map[p.id] = {
          delegateId: p.id, name: p.name, zone: p.zone,
          status: p.status as DelegateStatus,
          latitude: p.lat, longitude: p.lng, timestamp: p.lastSeen,
        };
      }
    });
    setPositions(map);
  }, [initialPositions]);

  // Construire les tracés depuis l'historique
  useEffect(() => {
    if (!historyData) return;
    const trailMap: TrailMap = {};
    (historyData as any[]).forEach((log: any) => {
      const id = log.delegateId;
      if (!trailMap[id]) trailMap[id] = [];
      trailMap[id].push({
        lat: log.latitude, lng: log.longitude,
        timestamp: log.timestamp, status: log.status,
      });
    });
    setTrails(trailMap);
  }, [historyData]);

  // Socket temps réel
  useEffect(() => {
    if (!token) return;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "https://inox-pharma-0gkr.onrender.com",
      { auth: { token }, reconnection: true }
    );

    socket.on("delegate_location_update", (data: GPSPosition) => {
      setPositions((prev) => ({ ...prev, [data.delegateId]: data }));
      // Ajouter au tracé en temps réel
      if (selectedDate === new Date().toISOString().split("T")[0]) {
        setTrails((prev) => {
          const existing = prev[data.delegateId] || [];
          // Éviter les doublons trop proches (< 10m)
          const last = existing[existing.length - 1];
          if (last && Math.abs(last.lat - data.latitude) < 0.0001 && Math.abs(last.lng - data.longitude) < 0.0001) {
            return prev;
          }
          return {
            ...prev,
            [data.delegateId]: [
              ...existing,
              { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp || new Date().toISOString(), status: data.status },
            ],
          };
        });
      }
    });

    socket.on("delegate_offline", ({ delegateId }: { delegateId: string }) => {
      setPositions((prev) =>
        prev[delegateId]
          ? { ...prev, [delegateId]: { ...prev[delegateId], status: "INACTIF" } }
          : prev
      );
    });

    return () => { socket.disconnect(); };
  }, [token, selectedDate]);

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

  // Centre de la carte (Abidjan par défaut)
  const mapCenter: [number, number] = filtered.length > 0
    ? [filtered[0].latitude, filtered[0].longitude]
    : [5.354, -4.008];

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">GPS — Suivi Temps Réel</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur de date */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-500 font-medium">Trajet du</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm outline-none text-gray-700"
            />
          </div>
          {/* Toggle tracé */}
          <button
            onClick={() => setShowTrails(!showTrails)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition font-medium ${
              showTrails
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {showTrails ? "🗺️ Trajets visibles" : "🗺️ Afficher trajets"}
          </button>
        </div>
      </div>

      {/* Compteurs par statut */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(STATUS_COLORS) as [DelegateStatus, string][]).map(([status, color]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            className={`bg-white rounded-xl px-4 py-2.5 shadow-sm border transition flex items-center gap-2 ${
              filterStatus === status ? "border-current shadow-md" : "border-gray-100"
            }`}
            style={{ color: filterStatus === status ? color : undefined }}
          >
            <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status]}</span>
            <span className="text-sm font-bold" style={{ color }}>{counts[status] || 0}</span>
          </button>
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
        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} délégué(s) • {Object.keys(trails).length} trajet(s) enregistré(s)
          {isToday && <span className="ml-2 text-green-600 font-medium">● Temps réel</span>}
        </span>
      </div>

      {/* Légende des trajets */}
      {showTrails && Object.keys(trails).length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Légende des trajets</p>
          <div className="flex flex-wrap gap-3">
            {Object.keys(trails).map(delegateId => {
              const pos = positions[delegateId];
              const name = pos?.name || (delegates as any[]).find((d: any) => d.id === delegateId)?.user
                ? `${(delegates as any[]).find((d: any) => d.id === delegateId)?.user?.firstName} ${(delegates as any[]).find((d: any) => d.id === delegateId)?.user?.lastName}`
                : delegateId.slice(0, 8);
              const color = getDelegateColor(delegateId);
              const points = trails[delegateId]?.length || 0;
              return (
                <div key={delegateId} className="flex items-center gap-2 text-sm">
                  <div style={{ width: 24, height: 3, background: color, borderRadius: 2, borderTop: `2px dashed ${color}` }} />
                  <span className="text-gray-700 font-medium">{pos?.name || name}</span>
                  <span className="text-xs text-gray-400">({points} pts)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carte Leaflet */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ position: "relative" }}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: "560px", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          />

          {/* Tracés pointillés par délégué */}
          {showTrails && Object.entries(trails).map(([delegateId, points]) => {
            if (points.length < 2) return null;
            const color = getDelegateColor(delegateId);
            const latlngs: [number, number][] = points.map(p => [p.lat, p.lng]);

            return (
              <div key={delegateId}>
                {/* Ligne principale pointillée */}
                <Polyline
                  positions={latlngs}
                  pathOptions={{
                    color,
                    weight:    3,
                    opacity:   0.7,
                    dashArray: "8, 6",
                  }}
                />
                {/* Points intermédiaires */}
                {points.map((pt, i) => {
                  // Afficher seulement début, fin et points espacés
                  const isFirst = i === 0;
                  const isLast  = i === points.length - 1;
                  const showDot = isFirst || isLast || i % 5 === 0;
                  if (!showDot) return null;
                  return (
                    <CircleMarker
                      key={i}
                      center={[pt.lat, pt.lng]}
                      radius={isFirst || isLast ? 6 : 3}
                      pathOptions={{
                        color: "white",
                        fillColor: color,
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-bold" style={{ color }}>{isFirst ? "🟢 Départ" : isLast ? "🔴 Dernière position" : "📍 Passage"}</p>
                          <p className="text-gray-500 mt-1">{new Date(pt.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="text-gray-400">{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </div>
            );
          })}

          {/* Marqueurs position actuelle */}
          {filtered.map((p) => (
            <Marker
              key={p.delegateId}
              position={[p.latitude, p.longitude]}
              icon={createIcon(p.status, p.name)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold text-gray-800 mb-2">{p.name}</p>
                  <div className="space-y-1">
                    <p className="text-gray-500 text-xs">📍 Zone : {p.zone || "—"}</p>
                    <p style={{ color: STATUS_COLORS[p.status] }} className="font-semibold text-xs">
                      ● {STATUS_LABELS[p.status]}
                    </p>
                    {p.timestamp && (
                      <p className="text-gray-400 text-xs">
                        🕐 {new Date(p.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </p>
                    )}
                    {trails[p.delegateId] && (
                      <p className="text-gray-400 text-xs">
                        🗺️ {trails[p.delegateId].length} point(s) de trajet aujourd'hui
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Aucun délégué */}
        {allPositions.length === 0 && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: "16px 24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 999, textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              ⏳ En attente des positions des délégués...
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
              Le GPS démarre automatiquement quand un délégué se connecte
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
