import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket }  from "socket.io-client";
import { useAuth }     from "../../contexts/AuthContext";
import { MapPin, Navigation, Coffee, Wifi, WifiOff, Clock, CheckCircle } from "lucide-react";

type Status = "EN_VISITE" | "EN_DEPLACEMENT" | "EN_PAUSE";

const STATUSES: { key: Status; label: string; icon: any; color: string }[] = [
  { key: "EN_VISITE",      label: "En visite",      icon: MapPin,      color: "#16a34a" },
  { key: "EN_DEPLACEMENT", label: "En déplacement", icon: Navigation,  color: "#2563eb" },
  { key: "EN_PAUSE",       label: "En pause",        icon: Coffee,      color: "#d97706" },
];

const STOP_HOUR   = 18;
const STOP_MINUTE = 30;

export default function GeoTracker() {
  const { token }    = useAuth();
  const socketRef    = useRef<Socket | null>(null);
  const watchRef     = useRef<number | null>(null);
  const pingRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef    = useRef<Status>("EN_DEPLACEMENT");
  const lastPosRef   = useRef<{ lat: number; lng: number } | null>(null);

  const [tracking,  setTracking]  = useState(false);
  const [status,    setStatus]    = useState<Status>("EN_DEPLACEMENT");
  const [lastPos,   setLastPos]   = useState<{ lat: number; lng: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [sendCount, setSendCount] = useState(0);
  const [lastSent,  setLastSent]  = useState<Date | null>(null);
  const [error,     setError]     = useState("");
  const [autoStart, setAutoStart] = useState(false);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      { auth: { token }, reconnection: true, reconnectionDelay: 2000 }
    );
    socketRef.current = socket;
    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
  }, [token]);

  const sendPosition = useCallback((lat: number, lng: number, st: Status) => {
    lastPosRef.current = { lat, lng };
    setLastPos({ lat, lng });
    if (!socketRef.current?.connected) { connectSocket(); return; }
    socketRef.current.emit("send_location", { latitude: lat, longitude: lng, status: st });
    setSendCount((c) => c + 1);
    setLastSent(new Date());
  }, [connectSocket]);

  const stopTracking = useCallback((reason?: string) => {
    if (watchRef.current    !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (pingRef.current)      { clearInterval(pingRef.current);     pingRef.current    = null; }
    if (reconnRef.current)    { clearInterval(reconnRef.current);   reconnRef.current  = null; }
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setTracking(false);
    setConnected(false);
    if (reason) setError(reason);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError("GPS non disponible"); return; }

    const now  = new Date();
    const stop = new Date();
    stop.setHours(STOP_HOUR, STOP_MINUTE, 0, 0);
    if (now >= stop) { setError(`Le suivi GPS s'arrête à ${STOP_HOUR}h${STOP_MINUTE}.`); return; }

    setError("");
    connectSocket();

    // Arrêt automatique à 18h30
    const msLeft = stop.getTime() - now.getTime();
    stopTimerRef.current = setTimeout(() => {
      stopTracking(`Suivi GPS arrêté automatiquement à ${STOP_HOUR}h${STOP_MINUTE}.`);
    }, msLeft);

    // watchPosition — avant-plan
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
      ()    => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    // Ping toutes les 30s — arrière-plan
    pingRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
        () => {},
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
      );
    }, 30000);

    // Reconnexion socket toutes les 15s
    reconnRef.current = setInterval(() => {
      if (!socketRef.current?.connected) connectSocket();
    }, 15000);

    setTracking(true);
  }, [connectSocket, sendPosition, stopTracking]);

  // ── Démarrage AUTOMATIQUE au montage ────────────────────────
  useEffect(() => {
    const now  = new Date();
    const stop = new Date();
    stop.setHours(STOP_HOUR, STOP_MINUTE, 0, 0);

    if (now < stop) {
      setAutoStart(true);
      startTracking();
    } else {
      setError(`Le suivi GPS est disponible de 0h00 à ${STOP_HOUR}h${STOP_MINUTE}.`);
    }

    // Retour en avant-plan → forcer position immédiate
    const handleVisibility = () => {
      if (!document.hidden) {
        if (!socketRef.current?.connected) connectSocket();
        if (lastPosRef.current) {
          sendPosition(lastPosRef.current.lat, lastPosRef.current.lng, statusRef.current);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTracking();
    };
  }, []);

  const changeStatus = (newStatus: Status) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
    if (tracking && lastPosRef.current) {
      sendPosition(lastPosRef.current.lat, lastPosRef.current.lng, newStatus);
    }
  };

  // Calcul temps restant
  const now  = new Date();
  const stop = new Date();
  stop.setHours(STOP_HOUR, STOP_MINUTE, 0, 0);
  const msLeft    = Math.max(0, stop.getTime() - now.getTime());
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minsLeft  = Math.floor((msLeft % 3600000) / 60000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Suivi GPS</h2>
        {tracking && msLeft > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-xl">
            <Clock size={12} />
            Arrêt dans {hoursLeft}h{String(minsLeft).padStart(2,"0")}
          </div>
        )}
      </div>

      {/* Statut connexion */}
      {tracking ? (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
          connected ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
        }`}>
          {connected
            ? <Wifi    size={18} className="text-green-500 flex-shrink-0" />
            : <WifiOff size={18} className="text-yellow-500 flex-shrink-0" />
          }
          <div className="flex-1">
            <p className={`font-semibold text-sm ${connected ? "text-green-700" : "text-yellow-700"}`}>
              {connected
                ? "📍 Position partagée en direct"
                : "🔄 Reconnexion en cours..."}
            </p>
            {lastPos && (
              <p className="text-xs text-gray-400 mt-0.5">
                {lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}
                {lastSent && ` · ${lastSent.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`}
              </p>
            )}
            {sendCount > 0 && (
              <p className="text-xs text-gray-400">{sendCount} position(s) envoyée(s)</p>
            )}
          </div>
          {connected && <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm">GPS inactif</p>
        </div>
      )}

      {/* Sélection statut */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Mon statut actuel
        </p>
        <div className="flex flex-col gap-2">
          {STATUSES.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => changeStatus(key)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition font-medium text-sm"
              style={{
                background:  status === key ? color : "white",
                borderColor: status === key ? color : "#e5e7eb",
                color:       status === key ? "white" : "#6b7280",
              }}
            >
              <Icon size={18} />
              {label}
              {status === key && (
                <span className="ml-auto text-white/80 text-xs flex items-center gap-1">
                  <CheckCircle size={12} /> Actif
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-start gap-2">
        <Clock size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Le suivi GPS démarre <strong>automatiquement</strong> à votre connexion et s'arrête à <strong>{STOP_HOUR}h{STOP_MINUTE}</strong>.
          Il continue même si l'app est en arrière-plan.
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
