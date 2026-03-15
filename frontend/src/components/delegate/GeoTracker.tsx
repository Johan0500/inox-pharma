import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { MapPin, Navigation, Coffee, Play, Square, Wifi, WifiOff } from "lucide-react";

type Status = "EN_VISITE" | "EN_DEPLACEMENT" | "EN_PAUSE";

const STATUSES: { key: Status; label: string; icon: any; color: string; bg: string }[] = [
  { key: "EN_VISITE",      label: "En visite",      icon: MapPin,      color: "bg-green-500", bg: "bg-green-50 border-green-200 text-green-700" },
  { key: "EN_DEPLACEMENT", label: "En déplacement", icon: Navigation,  color: "bg-blue-500",  bg: "bg-blue-50 border-blue-200 text-blue-700"   },
  { key: "EN_PAUSE",       label: "En pause",       icon: Coffee,      color: "bg-yellow-500",bg: "bg-yellow-50 border-yellow-200 text-yellow-700" },
];

export default function GeoTracker() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const watchRef  = useRef<number | null>(null);

  const [tracking,   setTracking]   = useState(false);
  const [status,     setStatus]     = useState<Status>("EN_DEPLACEMENT");
  const [lastPos,    setLastPos]    = useState<{ lat: number; lng: number } | null>(null);
  const [error,      setError]      = useState("");
  const [connected,  setConnected]  = useState(false);
  const [sendCount,  setSendCount]  = useState(0);
  const [lastSent,   setLastSent]   = useState<Date | null>(null);

  const sendPosition = useCallback(
    (lat: number, lng: number, st: Status) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("send_location", {
        latitude:  lat,
        longitude: lng,
        status:    st,
      });
      setLastPos({ lat, lng });
      setSendCount((c) => c + 1);
      setLastSent(new Date());
    },
    []
  );

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée sur cet appareil.");
      return;
    }
    setError("");

    // Connexion Socket.io
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      { auth: { token }, reconnection: true }
    );
    socketRef.current = socket;
    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Démarrer watchPosition
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendPosition(pos.coords.latitude, pos.coords.longitude, status);
      },
      (err) => {
        setError(`Erreur GPS : ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    setTracking(true);
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setTracking(false);
    setConnected(false);
    setSendCount(0);
  };

  const changeStatus = (newStatus: Status) => {
    setStatus(newStatus);
    if (tracking && lastPos) {
      sendPosition(lastPos.lat, lastPos.lng, newStatus);
    }
  };

  // Nettoyage au démontage
  useEffect(() => () => { stopTracking(); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Ma Position GPS</h2>

      {/* Sélection du statut */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-3">Mon statut actuel :</p>
        <div className="flex flex-col gap-2">
          {STATUSES.map(({ key, label, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => changeStatus(key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition font-medium text-sm
                ${status === key
                  ? `${color} text-white border-transparent shadow-md`
                  : `bg-white border-gray-200 text-gray-600 hover:border-gray-300`
                }`}
            >
              <Icon size={18} />
              {label}
              {status === key && <span className="ml-auto text-white/80 text-xs">✓ Sélectionné</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton Start/Stop */}
      <button
        onClick={tracking ? stopTracking : startTracking}
        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3
                    transition shadow-lg active:scale-95
          ${tracking
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
      >
        {tracking
          ? <><Square size={20} /> Arrêter le suivi GPS</>
          : <><Play  size={20} /> Démarrer le suivi GPS</>
        }
      </button>

      {/* Statut de connexion */}
      {tracking && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${
          connected
            ? "bg-green-50 border-green-200"
            : "bg-yellow-50 border-yellow-200"
        }`}>
          <div className="mt-0.5">
            {connected
              ? <Wifi size={18} className="text-green-500" />
              : <WifiOff size={18} className="text-yellow-500" />
            }
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${connected ? "text-green-700" : "text-yellow-700"}`}>
              {connected ? "Suivi GPS actif" : "Reconnexion en cours..."}
            </p>
            {lastPos && (
              <p className="text-xs text-gray-500 mt-0.5">
                Lat : {lastPos.lat.toFixed(5)} | Lng : {lastPos.lng.toFixed(5)}
              </p>
            )}
            {sendCount > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {sendCount} position(s) envoyée(s)
                {lastSent && ` — dernière à ${lastSent.toLocaleTimeString("fr-FR")}`}
              </p>
            )}
          </div>
          {connected && (
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse mt-1 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Info si pas actif */}
      {!tracking && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">ℹ️ Comment ça fonctionne</p>
          <p className="text-blue-600 text-xs leading-relaxed">
            Sélectionnez votre statut, puis appuyez sur "Démarrer le suivi GPS".
            Votre position sera transmise en temps réel à l'administrateur sur la carte.
            Maintenez l'application ouverte pour le suivi continu.
          </p>
        </div>
      )}
    </div>
  );
}
