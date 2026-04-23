import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useLab  } from "../../../contexts/LabContext";
import api from "../../../services/api";
import { GPSPosition, DelegateStatus } from "../../../types";
import "leaflet/dist/leaflet.css";
import { Search, X } from "lucide-react";

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
const TRAIL_COLORS = [
  "#0066CC","#dc2626","#7c3aed","#d97706",
  "#059669","#db2777","#0891b2","#92400e",
];

function createIcon(status: DelegateStatus, name: string, color?: string) {
  const c = color || STATUS_COLORS[status] || "#9CA3AF";
  const short = name.split(" ")[0];
  return L.divIcon({
    html: `<div style="
      background:${c};color:white;
      padding:5px 12px;border-radius:20px;
      font-size:11px;font-weight:700;white-space:nowrap;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
      border:2px solid rgba(255,255,255,0.9);
      font-family:system-ui,sans-serif;
    "><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.8);display:inline-block;margin-right:4px"></span>${short}</div>`,
    className: "",
    iconAnchor: [30, 15],
  });
}

interface TrailPoint { lat: number; lng: number; timestamp: string; status: string; }
type TrailMap  = Record<string, TrailPoint[]>;
type RoutedMap = Record<string, [number, number][]>;

// ── OSRM snap-to-road (gratuit, pas de clé API) ─────────────────
// Découpe en chunks de 100 pts pour éviter les URLs trop longues
async function fetchOSRMRoute(points: TrailPoint[]): Promise<[number, number][]> {
  if (points.length < 2) return points.map(p => [p.lat, p.lng]);
  const CHUNK = 100;
  const allCoords: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i += CHUNK - 1) {
    const chunk  = points.slice(i, i + CHUNK);
    const coords = chunk.map(p => `${p.lng},${p.lat}`).join(";");
    const url    = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    try {
      const res  = await fetch(url);
      const json = await res.json();
      if (json.code === "Ok" && json.routes?.[0]?.geometry?.coordinates) {
        const routeCoords: [number, number][] = json.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        if (allCoords.length > 0) routeCoords.shift(); // éviter doublon à la jonction
        allCoords.push(...routeCoords);
      } else {
        chunk.forEach(p => allCoords.push([p.lat, p.lng]));
      }
    } catch {
      chunk.forEach(p => allCoords.push([p.lat, p.lng]));
    }
  }
  return allCoords;
}

export default function GPSMapTab() {
  const { token }              = useAuth();
  const { selectedLab }        = useLab();
  const isGlobal               = selectedLab === "all";

  const [positions,    setPositions]    = useState<Record<string, GPSPosition & { laboratory?: string }>>({});
  const [trails,       setTrails]       = useState<TrailMap>({});
  const [routedTrails, setRoutedTrails] = useState<RoutedMap>({});
  const [routingIds,   setRoutingIds]   = useState<Set<string>>(new Set());
  const [checkIns,     setCheckIns]     = useState<Array<{
    id: string; delegateId: string; name: string; laboratory: string;
    latitude: number; longitude: number; placeName: string; timestamp: string;
  }>>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showTrails,   setShowTrails]   = useState(true);

  // Filtres
  const [filterName,   setFilterName]   = useState("");
  const [filterZone,   setFilterZone]   = useState("");
  const [filterLab,    setFilterLab]    = useState("");
  const [filterStatus, setFilterStatus] = useState<DelegateStatus | "">("");

  const colorIndexRef = useRef<Record<string, number>>({});
  const colorCounter  = useRef(0);

  const getDelegateColor = (id: string): string => {
    if (colorIndexRef.current[id] === undefined) {
      colorIndexRef.current[id] = colorCounter.current % TRAIL_COLORS.length;
      colorCounter.current++;
    }
    return TRAIL_COLORS[colorIndexRef.current[id]];
  };

  // Positions initiales — filtré par labo via X-Lab header
  const { data: initialPositions } = useQuery({
    queryKey: ["gps-positions", selectedLab],
    queryFn:  () => api.get("/gps/positions", {
      headers: { "X-Lab": selectedLab || "all" },
    }).then((r) => r.data),
    refetchInterval: 30000,
  });

  // Historique du jour — filtré par labo
  const { data: historyData } = useQuery({
    queryKey: ["gps-history", selectedDate, selectedLab],
    queryFn:  () => api.get("/gps/history", {
      params:  { date: selectedDate },
      headers: { "X-Lab": selectedLab || "all" },
    }).then(r => r.data),
    staleTime: 60000,
  });

  // Labos pour filtre vue globale
  const { data: labsData = [] } = useQuery({
    queryKey: ["laboratories"],
    queryFn:  () => api.get("/laboratories").then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled:  isGlobal,
  });

  useEffect(() => {
    if (!initialPositions) return;
    const map: Record<string, any> = {};
    (initialPositions as any[]).forEach((p: any) => {
      if (p.lat && p.lng) {
        map[p.id] = {
          delegateId: p.id, name: p.name, zone: p.zone,
          status: p.status, latitude: p.lat, longitude: p.lng,
          timestamp: p.lastSeen, laboratory: p.laboratory,
        };
      }
    });
    setPositions(map);
  }, [initialPositions]);

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
    // Réinitialiser les routes calculées quand la date change
    setRoutedTrails({});
    setRoutingIds(new Set());
  }, [historyData]);

  // ── Calcul des routes OSRM pour chaque délégué ─────────────────
  useEffect(() => {
    if (!showTrails) return;
    Object.entries(trails).forEach(([delegateId, points]) => {
      if (points.length < 2) return;
      if (routedTrails[delegateId] !== undefined) return; // déjà calculé
      if (routingIds.has(delegateId)) return;            // en cours

      setRoutingIds(prev => new Set([...prev, delegateId]));
      fetchOSRMRoute(points).then(coords => {
        setRoutedTrails(prev => ({ ...prev, [delegateId]: coords }));
        setRoutingIds(prev => { const s = new Set(prev); s.delete(delegateId); return s; });
      });
    });
  }, [trails, showTrails]);

  // Socket temps réel
  useEffect(() => {
    if (!token) return;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "https://inox-pharma-0gkr.onrender.com",
      { auth: { token }, reconnection: true }
    );

    socket.on("delegate_location_update", (data: any) => {
      setPositions((prev) => ({ ...prev, [data.delegateId]: { ...data, laboratory: data.laboratory } }));
      const isToday = selectedDate === new Date().toISOString().split("T")[0];
      if (isToday) {
        setTrails((prev) => {
          const existing = prev[data.delegateId] || [];
          const last = existing[existing.length - 1];
          if (last && Math.abs(last.lat - data.latitude) < 0.0001 && Math.abs(last.lng - data.longitude) < 0.0001)
            return prev;
          return {
            ...prev,
            [data.delegateId]: [...existing, {
              lat: data.latitude, lng: data.longitude,
              timestamp: data.timestamp || new Date().toISOString(), status: data.status,
            }],
          };
        });
      }
    });

    socket.on("delegate_check_in", (data: any) => {
      setCheckIns(prev => [{
        id: `${data.delegateId}_${Date.now()}`,
        delegateId: data.delegateId,
        name: data.name,
        laboratory: data.laboratory || "",
        latitude: data.latitude,
        longitude: data.longitude,
        placeName: data.placeName,
        timestamp: data.timestamp,
      }, ...prev.slice(0, 49)]); // garder max 50 check-ins
    });

    socket.on("delegate_offline", ({ delegateId }: { delegateId: string }) => {
      setPositions((prev) =>
        prev[delegateId] ? { ...prev, [delegateId]: { ...prev[delegateId], status: "INACTIF" } } : prev
      );
    });

    return () => { socket.disconnect(); };
  }, [token, selectedDate]);

  // ── Application des filtres ───────────────────────────────
  const allPositions = Object.values(positions);
  const filtered = allPositions.filter((p) => {
    if (filterName && !p.name?.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterZone && !p.zone?.toLowerCase().includes(filterZone.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (isGlobal && filterLab && (p as any).laboratory?.toLowerCase() !== filterLab.toLowerCase()) return false;
    return p.latitude && p.longitude;
  });

  const counts = allPositions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasFilters = filterName || filterZone || filterStatus || (isGlobal && filterLab);
  const resetFilters = () => { setFilterName(""); setFilterZone(""); setFilterStatus(""); setFilterLab(""); };

  const mapCenter: [number, number] = filtered.length > 0
    ? [filtered[0].latitude, filtered[0].longitude]
    : [5.354, -4.008];

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">GPS — Suivi Temps Réel</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isGlobal ? "Vue globale — tous les laboratoires" : `Laboratoire : ${selectedLab?.toUpperCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-500 font-medium">Trajet du</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm outline-none text-gray-700" />
          </div>
          <button onClick={() => setShowTrails(!showTrails)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition font-medium ${
              showTrails ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}>
            🗺️ {showTrails ? "Trajets ON" : "Trajets OFF"}
            {showTrails && routingIds.size > 0 && (
              <span className="text-xs bg-white text-blue-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                ⏳ {routingIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compteurs statuts */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(STATUS_COLORS) as [DelegateStatus, string][]).map(([status, color]) => (
          <button key={status}
            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            className={`bg-white rounded-xl px-4 py-2.5 shadow-sm border transition flex items-center gap-2 ${
              filterStatus === status ? "border-current shadow-md" : "border-gray-100"
            }`}
            style={{ color: filterStatus === status ? color : undefined }}>
            <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status]}</span>
            <span className="text-sm font-bold" style={{ color }}>{counts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── FILTRES ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Filtres de recherche</p>
        <div className="flex flex-wrap gap-3 items-center">

          {/* Filtre Nom */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={filterName} onChange={(e) => setFilterName(e.target.value)}
              className="border rounded-xl pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none w-48"
              placeholder="Nom du délégué..." />
          </div>

          {/* Filtre Zone */}
          <div className="relative">
            <input value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none w-40"
              placeholder="Zone..." />
          </div>

          {/* Filtre Labo — visible uniquement en vue globale (super admin) */}
          {isGlobal && (
            <select value={filterLab} onChange={(e) => setFilterLab(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">Tous les labos</option>
              {(labsData as any[]).map((l: any) => (
                <option key={l.id} value={l.name.toLowerCase()}>{l.name.toUpperCase()}</option>
              ))}
            </select>
          )}

          {/* Reset filtres */}
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 text-red-500 text-sm border border-red-200 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition">
              <X size={13} /> Réinitialiser
            </button>
          )}

          <span className="ml-auto text-sm text-gray-400">
            {filtered.length}/{allPositions.length} délégué(s)
            {isToday && <span className="ml-2 text-green-600 font-semibold">● Temps réel</span>}
          </span>
        </div>

        {/* Filtres actifs */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
            {filterName && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Nom : {filterName}</span>}
            {filterZone && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Zone : {filterZone}</span>}
            {filterLab  && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Labo : {filterLab.toUpperCase()}</span>}
            {filterStatus && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: STATUS_COLORS[filterStatus] + "20", color: STATUS_COLORS[filterStatus] }}>
              {STATUS_LABELS[filterStatus]}
            </span>}
          </div>
        )}
      </div>

      {/* Légende trajets */}
      {showTrails && Object.keys(trails).length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Trajets du {selectedDate}</p>
          <div className="flex flex-wrap gap-4">
            {Object.keys(trails).map(delegateId => {
              const pos = positions[delegateId];
              if (!pos) return null;
              const color = getDelegateColor(delegateId);
              return (
                <div key={delegateId} className="flex items-center gap-2 text-sm">
                  <svg width="24" height="4">
                    <line x1="0" y1="2" x2="24" y2="2" stroke={color} strokeWidth="2" strokeDasharray="4,3" />
                  </svg>
                  <span className="text-gray-700 font-medium">{pos.name}</span>
                  {isGlobal && pos.laboratory && (
                    <span className="text-xs text-gray-400">({(pos as any).laboratory})</span>
                  )}
                  <span className="text-xs text-gray-400">{trails[delegateId]?.length || 0} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carte */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ position: "relative" }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: "560px", width: "100%", zIndex: 0 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          />

          {/* Tracés suivant les routes réelles (OSRM) */}
          {showTrails && Object.entries(trails).map(([delegateId, points]) => {
            if (points.length < 2) return null;
            const pos = positions[delegateId];
            if (filtered.length > 0 && !filtered.find(p => p.delegateId === delegateId)) {
              if (hasFilters) return null;
            }
            const color = getDelegateColor(delegateId);
            // Utiliser la route OSRM si disponible, sinon lignes droites en attendant
            const latlngs: [number, number][] = routedTrails[delegateId]
              ?? points.map(p => [p.lat, p.lng]);
            const isRouting = routingIds.has(delegateId);
            return (
              <div key={delegateId}>
                <Polyline
                  positions={latlngs}
                  pathOptions={{
                    color,
                    weight:     isRouting ? 2 : 4,
                    opacity:    isRouting ? 0.4 : 0.85,
                    dashArray:  isRouting ? "6,5" : undefined, // pointillé pendant le chargement
                  }}
                />
                {points.map((pt, i) => {
                  const isFirst = i === 0;
                  const isLast  = i === points.length - 1;
                  if (!isFirst && !isLast && i % 6 !== 0) return null;
                  return (
                    <CircleMarker key={i} center={[pt.lat, pt.lng]}
                      radius={isFirst || isLast ? 6 : 4}
                      pathOptions={{ color: "white", fillColor: color, fillOpacity: 1, weight: 2 }}>
                      <Popup>
                        <div className="text-xs space-y-1">
                          <p className="font-bold" style={{ color }}>
                            {isFirst ? "🟢 Départ" : isLast ? "🔴 Dernière pos." : "📍 Passage"}
                          </p>
                          {pos && <p className="text-gray-700">{pos.name}</p>}
                          <p className="text-gray-500">{new Date(pt.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
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
            <Marker key={p.delegateId} position={[p.latitude, p.longitude]}
              icon={createIcon(p.status, p.name, getDelegateColor(p.delegateId))}
              zIndexOffset={1000}>
              <Popup>
                <div className="text-sm min-w-[200px] space-y-1">
                  <p className="font-bold text-gray-800">{p.name}</p>
                  {isGlobal && (p as any).laboratory && (
                    <p className="text-xs font-semibold text-purple-600">🏭 {(p as any).laboratory}</p>
                  )}
                  <p className="text-gray-500 text-xs">📍 Zone : {p.zone || "—"}</p>
                  <p style={{ color: STATUS_COLORS[p.status] }} className="font-semibold text-xs">● {STATUS_LABELS[p.status]}</p>
                  {p.timestamp && (
                    <p className="text-gray-400 text-xs">🕐 {new Date(p.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                  )}
                  {trails[p.delegateId] && (
                    <p className="text-gray-400 text-xs">🗺️ {trails[p.delegateId].length} points de trajet</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {/* ── Marqueurs Check-in ── */}
          {checkIns.map((ci) => {
            const ciIcon = L.divIcon({
              html: `<div style="
                background:#7c3aed;color:white;
                padding:5px 10px;border-radius:20px;
                font-size:11px;font-weight:700;white-space:nowrap;
                box-shadow:0 3px 10px rgba(0,0,0,0.35);
                border:2px solid rgba(255,255,255,0.9);
                font-family:system-ui,sans-serif;
                display:flex;align-items:center;gap:4px;
              "><span style="font-size:13px">📍</span>${ci.placeName.length > 18 ? ci.placeName.slice(0,18)+"…" : ci.placeName}</div>`,
              className: "",
              iconAnchor: [30, 15],
            });
            return (
              <Marker key={ci.id} position={[ci.latitude, ci.longitude]} icon={ciIcon} zIndexOffset={2000}>
                <Popup>
                  <div className="text-sm min-w-[220px] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <p className="font-bold text-purple-700 text-base">{ci.placeName}</p>
                    </div>
                    <p className="text-gray-700 font-medium">{ci.name}</p>
                    {ci.laboratory && <p className="text-xs text-purple-500 font-semibold">🏭 {ci.laboratory}</p>}
                    <p className="text-xs text-gray-400">
                      🕐 {new Date(ci.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="bg-purple-50 rounded-lg px-2 py-1 text-xs text-purple-700 font-semibold text-center">
                      ✅ Pointage validé
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {allPositions.length === 0 && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: "16px 24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 999, textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>⏳ En attente des positions des délégués...</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Le GPS démarre automatiquement dès qu'un délégué se connecte</p>
          </div>
        )}
      </div>

      {/* ── Panneau check-ins récents ── */}
      {checkIns.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-purple-700 px-5 py-3 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              📍 Pointages récents
              <span className="bg-white text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{checkIns.length}</span>
            </h3>
            <button
              onClick={() => setCheckIns([])}
              className="text-purple-200 hover:text-white text-xs transition"
            >
              Effacer
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {checkIns.map((ci) => (
              <div key={ci.id} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-lg">
                  📍
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{ci.placeName}</p>
                  <p className="text-xs text-gray-500">{ci.name} {ci.laboratory ? `· ${ci.laboratory}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-purple-600 font-semibold">
                    {new Date(ci.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(ci.timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}