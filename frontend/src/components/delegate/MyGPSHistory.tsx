import { useState, useEffect, useRef } from "react";
import { useQuery }                    from "@tanstack/react-query";
import { MapPin, Calendar }            from "lucide-react";
import api                             from "../../services/api";
import { useAuth }                     from "../../contexts/AuthContext";
import L                               from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MyGPSHistory() {
  const { user }        = useAuth();
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<L.Map | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["my-gps-history", date, user?.delegate?.id],
    queryFn:  () => user?.delegate?.id
      ? api.get(`/gps/history/${user.delegate.id}`, { params: { date } }).then((r) => r.data)
      : Promise.resolve([]),
    enabled: !!user?.delegate?.id,
  });

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([5.3484, -4.0107], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    map.eachLayer((layer) => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

    if ((logs as any[]).length > 0) {
      const points = (logs as any[]).map((l: any) => [l.latitude, l.longitude] as [number, number]);
      L.polyline(points, { color: "#2563eb", weight: 3 }).addTo(map);

      // Marqueur départ
      L.circleMarker(points[0], { radius: 8, color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1 })
        .bindPopup("Départ").addTo(map);

      // Marqueur arrivée
      L.circleMarker(points[points.length - 1], { radius: 8, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1 })
        .bindPopup("Dernière position").addTo(map);

      map.fitBounds(L.polyline(points).getBounds(), { padding: [20, 20] });
    }
  }, [logs]);

  const totalDistance = (logs as any[]).reduce((acc, log, i) => {
    if (i === 0) return 0;
    const prev = (logs as any[])[i - 1];
    const R    = 6371;
    const dLat = (log.latitude  - prev.latitude)  * Math.PI / 180;
    const dLon = (log.longitude - prev.longitude) * Math.PI / 180;
    const a    = Math.sin(dLat/2)**2 + Math.cos(prev.latitude * Math.PI/180) * Math.cos(log.latitude * Math.PI/180) * Math.sin(dLon/2)**2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Mon Historique GPS</h2>

      {/* Sélecteur de date */}
      <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        <Calendar size={16} className="text-blue-600 flex-shrink-0" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="flex-1 border-0 outline-none text-sm text-gray-700 bg-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-blue-600 mb-1">Points GPS</p>
          <p className="text-2xl font-bold text-blue-700">{(logs as any[]).length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-600 mb-1">Distance estimée</p>
          <p className="text-2xl font-bold text-green-700">{totalDistance.toFixed(1)} km</p>
        </div>
      </div>

      {/* Carte */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Chargement...</div>
        ) : (logs as any[]).length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <MapPin size={32} className="mb-2 text-gray-200" />
            <p className="text-sm">Aucune donnée GPS pour cette date</p>
          </div>
        ) : (
          <div ref={mapRef} className="h-64 w-full" />
        )}
      </div>
    </div>
  );
}