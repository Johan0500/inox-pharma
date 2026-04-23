import { useEffect, useRef, useCallback } from "react";
import { io, Socket }  from "socket.io-client";
import { useAuth }     from "../../contexts/AuthContext";

// ── GeoTracker — suivi GPS permanent avec mode offline ────────
// - Suit la position même sans connexion internet (comme Google Maps)
// - Stocke les positions en queue locale si hors ligne
// - Flush la queue dès que la connexion revient

const STOP_HOUR     = 22;
const PING_INTERVAL = 15000;   // ping toutes les 15s (meilleure précision)
const MIN_DISTANCE  = 10;      // ignorer les déplacements < 10m (réduire le bruit)
const MAX_OFFLINE   = 500;     // max 500 points offline stockés

type Status = "EN_VISITE" | "EN_DEPLACEMENT" | "EN_PAUSE";

interface OfflinePoint {
  latitude:  number;
  longitude: number;
  status:    string;
  timestamp: string;
}

// ── Distance Haversine en mètres ──────────────────────────────
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Queue offline (localStorage) ─────────────────────────────
const OFFLINE_KEY = "gps_offline_queue";

function loadOfflineQueue(): OfflinePoint[] {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]"); } catch { return []; }
}
function saveOfflineQueue(q: OfflinePoint[]) {
  try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(q.slice(-MAX_OFFLINE))); } catch {}
}
function clearOfflineQueue() {
  try { localStorage.removeItem(OFFLINE_KEY); } catch {}
}

export default function GeoTracker() {
  const { token } = useAuth();
  const socketRef    = useRef<Socket | null>(null);
  const watchRef     = useRef<number | null>(null);
  const pingRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef    = useRef<Status>("EN_DEPLACEMENT");
  const lastPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const startedRef   = useRef(false);
  const offlineRef   = useRef<OfflinePoint[]>(loadOfflineQueue());

  // ── Flush positions offline vers le serveur ───────────────
  const flushOffline = useCallback(() => {
    const queue = offlineRef.current;
    if (queue.length === 0) return;
    if (!socketRef.current?.connected) return;
    console.log(`📤 Flush ${queue.length} positions offline`);
    socketRef.current.emit("flush_offline_gps", queue);
    offlineRef.current = [];
    clearOfflineQueue();
  }, []);

  // ── Connexion socket ──────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "https://inox-pharma-0gkr.onrender.com",
      {
        auth:              { token },
        reconnection:      true,
        reconnectionDelay: 2000,
        transports:        ["websocket", "polling"],
      }
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ GPS socket connecté");
      // Flush dès la reconnexion
      setTimeout(flushOffline, 500);
    });

    socket.on("disconnect", () => {
      console.log("⚠️ GPS socket déconnecté");
    });

    socket.on("flush_offline_gps_ack", ({ count }: { count: number }) => {
      console.log(`✅ ${count} positions offline synchronisées`);
    });
  }, [token, flushOffline]);

  // ── Envoi d'une position ──────────────────────────────────
  const sendPosition = useCallback((lat: number, lng: number, st: Status) => {
    // Filtre de bruit : ignorer si < MIN_DISTANCE par rapport à la dernière position
    if (lastPosRef.current) {
      const dist = distanceMeters(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
      if (dist < MIN_DISTANCE) return; // pas bougé assez
    }
    lastPosRef.current = { lat, lng };

    const point: OfflinePoint = {
      latitude:  lat,
      longitude: lng,
      status:    st,
      timestamp: new Date().toISOString(),
    };

    if (socketRef.current?.connected) {
      // En ligne → envoyer directement
      socketRef.current.emit("send_location", { latitude: lat, longitude: lng, status: st });
      console.log(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)} [${st}]`);
    } else {
      // Hors ligne → stocker localement
      offlineRef.current.push(point);
      saveOfflineQueue(offlineRef.current);
      console.log(`📦 Stocké offline (${offlineRef.current.length} pts): ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      connectSocket(); // tenter de se reconnecter
    }
  }, [connectSocket]);

  // ── Arrêt du tracking ─────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchRef.current    !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (pingRef.current)               { clearInterval(pingRef.current);     pingRef.current    = null; }
    if (reconnRef.current)             { clearInterval(reconnRef.current);   reconnRef.current  = null; }
    if (stopTimerRef.current)          { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    socketRef.current?.disconnect();
    socketRef.current  = null;
    startedRef.current = false;
    console.log("🛑 GPS arrêté");
  }, []);

  // ── Démarrage du tracking ─────────────────────────────────
  const startTracking = useCallback(() => {
    if (startedRef.current) return;
    if (!navigator.geolocation) { console.warn("GPS non disponible"); return; }

    const now  = new Date();
    const stop = new Date();
    stop.setHours(STOP_HOUR, 0, 0, 0);
    if (now >= stop) { console.log("GPS: heure limite dépassée"); return; }

    startedRef.current = true;
    connectSocket();

    // Arrêt auto à STOP_HOUR
    stopTimerRef.current = setTimeout(() => {
      console.log(`GPS arrêté automatiquement à ${STOP_HOUR}h`);
      stopTracking();
    }, stop.getTime() - now.getTime());

    // watchPosition — haute précision, mise à jour immédiate à chaque déplacement
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
      (err) => console.warn("GPS watch erreur:", err.message),
      {
        enableHighAccuracy: true,
        maximumAge:         0,      // toujours une position fraîche
        timeout:            10000,
      }
    );

    // Ping périodique — fonctionne en arrière-plan quand watchPosition se met en pause
    pingRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      );
    }, PING_INTERVAL);

    // Reconnexion socket si déconnecté
    reconnRef.current = setInterval(() => {
      if (!socketRef.current?.connected) {
        connectSocket();
      } else {
        // Flush offline si connecté et queue non vide
        if (offlineRef.current.length > 0) flushOffline();
      }
    }, 10000);

    console.log("🚀 GPS démarré — mode offline actif");
  }, [connectSocket, sendPosition, stopTracking, flushOffline]);

  useEffect(() => {
    startTracking();

    // Retour en avant-plan
    const handleVisibility = () => {
      if (!document.hidden) {
        console.log("👁️ Retour en avant-plan — position immédiate");
        if (!socketRef.current?.connected) connectSocket();
        navigator.geolocation.getCurrentPosition(
          (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    };

    // Connexion réseau revenue → flush offline
    const handleOnline = () => {
      console.log("🌐 Connexion réseau rétablie → flush offline");
      connectSocket();
      setTimeout(flushOffline, 1000);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    // Wake Lock — empêche l'écran de s'éteindre sur mobile
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          console.log("🔒 Wake Lock actif");
          wakeLock.addEventListener("release", async () => {
            if (!document.hidden) await requestWakeLock();
          });
        }
      } catch (err) {
        console.warn("Wake Lock indisponible:", err);
      }
    };
    requestWakeLock();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      wakeLock?.release().catch(() => {});
      stopTracking();
    };
  }, []); // eslint-disable-line

  return null;
}