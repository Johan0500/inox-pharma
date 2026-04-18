import { useEffect, useRef, useCallback } from "react";
import { io, Socket }  from "socket.io-client";
import { useAuth }     from "../../contexts/AuthContext";

// ── GeoTracker INVISIBLE ──────────────────────────────────────
// Ce composant ne rend rien visuellement.
// Il démarre le GPS automatiquement à la connexion et tourne en
// arrière-plan tant que le délégué est connecté.
// Le statut est toujours EN_DEPLACEMENT par défaut.

const STOP_HOUR   = 22; // arrêt à 22h
const STOP_MINUTE = 0;
const PING_INTERVAL = 20000; // ping toutes les 20s

type Status = "EN_VISITE" | "EN_DEPLACEMENT" | "EN_PAUSE";

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
    socket.on("connect",    () => console.log("✅ GPS socket connecté"));
    socket.on("disconnect", () => console.log("⚠️ GPS socket déconnecté, reconnexion..."));
  }, [token]);

  const sendPosition = useCallback((lat: number, lng: number, st: Status) => {
    lastPosRef.current = { lat, lng };
    if (!socketRef.current?.connected) {
      connectSocket();
      return;
    }
    socketRef.current.emit("send_location", {
      latitude:  lat,
      longitude: lng,
      status:    st,
    });
    console.log(`📍 Position envoyée: ${lat.toFixed(5)}, ${lng.toFixed(5)} [${st}]`);
  }, [connectSocket]);

  const stopTracking = useCallback(() => {
    if (watchRef.current    !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (pingRef.current)               { clearInterval(pingRef.current);     pingRef.current    = null; }
    if (reconnRef.current)             { clearInterval(reconnRef.current);   reconnRef.current  = null; }
    if (stopTimerRef.current)          { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    socketRef.current?.disconnect();
    socketRef.current = null;
    startedRef.current = false;
    console.log("🛑 GPS arrêté");
  }, []);

  const startTracking = useCallback(() => {
    if (startedRef.current) return; // déjà démarré
    if (!navigator.geolocation) {
      console.warn("GPS non disponible sur cet appareil");
      return;
    }

    const now  = new Date();
    const stop = new Date();
    stop.setHours(STOP_HOUR, STOP_MINUTE, 0, 0);
    if (now >= stop) {
      console.log("GPS: heure limite dépassée");
      return;
    }

    startedRef.current = true;
    connectSocket();

    // Arrêt automatique à l'heure limite
    const msLeft = stop.getTime() - now.getTime();
    stopTimerRef.current = setTimeout(() => {
      console.log(`GPS arrêté automatiquement à ${STOP_HOUR}h${STOP_MINUTE}`);
      stopTracking();
    }, msLeft);

    // watchPosition — suivi continu en avant-plan
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
      (err) => console.warn("GPS watchPosition erreur:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Ping régulier — fonctionne même en arrière-plan
    pingRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
        (err) => console.warn("GPS ping erreur:", err.message),
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
      );
    }, PING_INTERVAL);

    // Reconnexion socket toutes les 15s si déconnecté
    reconnRef.current = setInterval(() => {
      if (!socketRef.current?.connected) connectSocket();
    }, 15000);

    console.log("🚀 GPS démarré — tracking permanent activé");
  }, [connectSocket, sendPosition, stopTracking]);

  useEffect(() => {
    // Démarrage immédiat au montage
    startTracking();

    // Retour en avant-plan → forcer position immédiate
    const handleVisibility = () => {
      if (!document.hidden) {
        console.log("👁️ App revenue en avant-plan — position forcée");
        if (!socketRef.current?.connected) connectSocket();
        // Position immédiate
        navigator.geolocation.getCurrentPosition(
          (pos) => sendPosition(pos.coords.latitude, pos.coords.longitude, statusRef.current),
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    };

    // Maintenir actif lors des changements de page (Page Visibility API)
    document.addEventListener("visibilitychange", handleVisibility);

    // Wake Lock API — empêche l'écran de s'éteindre sur mobile si possible
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          console.log("🔒 Wake Lock actif");
          wakeLock.addEventListener("release", () => {
            console.log("🔓 Wake Lock relâché");
          });
        }
      } catch (err) {
        console.warn("Wake Lock non disponible:", err);
      }
    };
    requestWakeLock();

    // Réactiver le Wake Lock si la page redevient visible
    const handleReactivate = async () => {
      if (!document.hidden && wakeLock?.released) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleReactivate);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("visibilitychange", handleReactivate);
      wakeLock?.release().catch(() => {});
      stopTracking();
    };
  }, []); // eslint-disable-line

  // Ce composant ne rend rien — il est purement fonctionnel
  return null;
}
