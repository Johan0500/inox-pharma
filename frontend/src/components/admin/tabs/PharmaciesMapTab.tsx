import { useEffect, useRef, useState } from "react";
import { useQuery }                    from "@tanstack/react-query";
import { MapPin, Search, Filter, X }   from "lucide-react";
import L                               from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import api from "../../../services/api";

const GROSSISTE_COLORS: Record<string, string> = {
  copharmed: "#2563eb",
  laborex:   "#16a34a",
  tedis:     "#d97706",
  dpci:      "#dc2626",
};

export default function PharmaciesMapTab() {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterRef     = useRef<any>(null);

  const [search,    setSearch]    = useState("");
  const [grossiste, setGrossite]  = useState("all");
  const [ville,     setVille]     = useState("all");
  const [selected,  setSelected]  = useState<any>(null);
  const [stats,     setStats]     = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["pharmacies-map"],
    queryFn:  () => api.get("/pharmacies", { params: { limit: 5000 } }).then((r) => r.data),
  });

  const pharmacies = (data?.pharmacies || data || []) as any[];

  // Villes uniques
  const villes = [...new Set(pharmacies.map((p) => p.ville).filter(Boolean))].sort();

  // Filtrer
  const filtered = pharmacies.filter((p) => {
    const matchSearch    = !search    || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.pharmacien?.toLowerCase().includes(search.toLowerCase());
    const matchGrosiste  = grossiste === "all" || p.grossiste?.name === grossiste;
    const matchVille     = ville     === "all" || p.ville === ville;
    return matchSearch && matchGrosiste && matchVille;
  }).filter((p) => p.latitude && p.longitude);

  // Initialiser la carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [5.3484, -4.0107],
      zoom:   11,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapInstanceRef.current);
  }, []);

  // Mettre à jour les marqueurs
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Supprimer l'ancien cluster
    if (clusterRef.current) map.removeLayer(clusterRef.current);

    const cluster = (L as any).markerClusterGroup({
      chunkedLoading:    true,
      maxClusterRadius:  60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        const size  = count < 10 ? 30 : count < 100 ? 36 : 42;
        return L.divIcon({
          html: `<div style="
            background:#0f172a;color:white;border-radius:50%;
            width:${size}px;height:${size}px;
            display:flex;align-items:center;justify-content:center;
            font-weight:bold;font-size:${size > 36 ? 12 : 11}px;
            border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)
          ">${count}</div>`,
          className: "",
          iconSize:  [size, size],
        });
      },
    });

    const newStats: Record<string, number> = {};

    filtered.forEach((p) => {
      const color = GROSSISTE_COLORS[p.grossiste?.name || ""] || "#6b7280";
      const gName = p.grossiste?.name || "inconnu";
      newStats[gName] = (newStats[gName] || 0) + 1;

      const icon = L.divIcon({
        html: `<div style="
          background:${color};border-radius:50% 50% 50% 0;
          width:20px;height:20px;transform:rotate(-45deg);
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)
        "></div>`,
        className: "",
        iconSize:  [20, 20],
        iconAnchor:[10, 20],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon });
      marker.bindPopup(`
        <div style="min-width:200px;font-family:sans-serif">
          <h3 style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#0f172a">${p.nom}</h3>
          ${p.pharmacien ? `<p style="margin:2px 0;font-size:12px;color:#475569">👤 ${p.pharmacien}</p>` : ""}
          ${p.adresse    ? `<p style="margin:2px 0;font-size:12px;color:#475569">📍 ${p.adresse}</p>` : ""}
          ${p.ville      ? `<p style="margin:2px 0;font-size:12px;color:#475569">🏙️ ${p.ville}</p>` : ""}
          ${p.telephone  ? `<p style="margin:2px 0;font-size:12px;color:#475569">📞 ${p.telephone}</p>` : ""}
          <div style="margin-top:8px;padding:4px 8px;border-radius:4px;background:${color};color:white;display:inline-block;font-size:11px;font-weight:bold">
            ${(p.grossiste?.name || "").toUpperCase()}
          </div>
        </div>
      `);

      marker.on("click", () => setSelected(p));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    setStats(newStats);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Carte des Pharmacies</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold">
            {filtered.length} pharmacies
          </span>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Rechercher une pharmacie..."
            />
          </div>
          <select value={grossiste} onChange={(e) => setGrossite(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">Tous grossistes</option>
            {["copharmed","laborex","tedis","dpci"].map((g) => (
              <option key={g} value={g}>{g.toUpperCase()}</option>
            ))}
          </select>
          <select value={ville} onChange={(e) => setVille(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">Toutes villes</option>
            {villes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          {(search || grossiste !== "all" || ville !== "all") && (
            <button onClick={() => { setSearch(""); setGrossite("all"); setVille("all"); }}
              className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm px-3 py-2 border border-red-200 rounded-xl">
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Stats par grossiste */}
      <div className="grid grid-cols-4 gap-3">
        {["copharmed","laborex","tedis","dpci"].map((g) => (
          <div key={g} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setGrossite(grossiste === g ? "all" : g)}>
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: GROSSISTE_COLORS[g] }} />
            <p className="text-xs font-bold text-gray-600">{g.toUpperCase()}</p>
            <p className="text-lg font-bold text-gray-800">{stats[g] || 0}</p>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(GROSSISTE_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            {name.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Carte */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center text-gray-400">
            Chargement de la carte...
          </div>
        ) : (
          <div ref={mapRef} className="h-[500px] w-full z-0" />
        )}
      </div>

      {/* Panneau détail pharmacie sélectionnée */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: GROSSISTE_COLORS[selected.grossiste?.name || ""] || "#6b7280" }}>
                <MapPin size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selected.nom}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: GROSSISTE_COLORS[selected.grossiste?.name || ""] || "#6b7280" }}>
                  {(selected.grossiste?.name || "").toUpperCase()}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            {[
              { label: "Pharmacien", value: selected.pharmacien },
              { label: "Adresse",    value: selected.adresse    },
              { label: "Ville",      value: selected.ville      },
              { label: "Région",     value: selected.region     },
              { label: "Téléphone",  value: selected.telephone  },
              { label: "Code client",value: selected.codeClient },
            ].filter((i) => i.value).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}