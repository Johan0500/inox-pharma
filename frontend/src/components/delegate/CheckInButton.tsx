import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth }    from "../../contexts/AuthContext";
import { MapPin, X, Check, Loader, WifiOff } from "lucide-react";

// ── Queue offline check-ins ───────────────────────────────────
const CI_OFFLINE_KEY = "checkin_offline_queue";

interface OfflineCheckIn {
  latitude:  number;
  longitude: number;
  placeName: string;
  timestamp: string;
}

function loadCIQueue(): OfflineCheckIn[] {
  try { return JSON.parse(localStorage.getItem(CI_OFFLINE_KEY) || "[]"); } catch { return []; }
}
function saveCIQueue(q: OfflineCheckIn[]) {
  try { localStorage.setItem(CI_OFFLINE_KEY, JSON.stringify(q)); } catch {}
}
function clearCIQueue() {
  try { localStorage.removeItem(CI_OFFLINE_KEY); } catch {}
}

export default function CheckInButton() {
  const { token }                    = useAuth();
  const socketRef                    = useRef<Socket | null>(null);
  const [showModal,  setShowModal]   = useState(false);
  const [placeName,  setPlaceName]   = useState("");
  const [locating,   setLocating]    = useState(false);
  const [sending,    setSending]     = useState(false);
  const [success,    setSuccess]     = useState(false);
  const [offline,    setOffline]     = useState(false);
  const [error,      setError]       = useState("");
  const [coords,     setCoords]      = useState<{ lat: number; lng: number } | null>(null);
  const [pendingCnt, setPendingCnt]  = useState(loadCIQueue().length);

  // ── Flush check-ins offline quand connexion revient ───────
  const flushOfflineCIs = useCallback((socket: Socket) => {
    const queue = loadCIQueue();
    if (queue.length === 0) return;
    console.log(`📤 Flush ${queue.length} check-ins offline`);
    queue.forEach(ci => socket.emit("check_in", ci));
    clearCIQueue();
    setPendingCnt(0);
  }, []);

  const getSocket = useCallback((): Socket => {
    if (socketRef.current?.connected) return socketRef.current;
    const s = io(
      import.meta.env.VITE_SOCKET_URL || "https://inox-pharma-0gkr.onrender.com",
      { auth: { token }, transports: ["websocket", "polling"] }
    );
    socketRef.current = s;

    s.on("connect", () => {
      flushOfflineCIs(s);
    });

    s.on("check_in_ack", ({ success: ok }: { success: boolean }) => {
      if (!ok) console.warn("check_in_ack: échec serveur");
    });

    return s;
  }, [token, flushOfflineCIs]);

  // Flush au retour en ligne
  useEffect(() => {
    const handleOnline = () => {
      const s = getSocket();
      if (s.connected) flushOfflineCIs(s);
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      socketRef.current?.disconnect();
    };
  }, [getSocket, flushOfflineCIs]);

  const handleOpen = () => {
    setShowModal(true);
    setPlaceName("");
    setError("");
    setSuccess(false);
    setOffline(false);
    setCoords(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Impossible d'obtenir la position GPS.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = () => {
    if (!coords)           { setError("Position GPS non disponible."); return; }
    if (!placeName.trim()) { setError("Entrez le nom du lieu.");        return; }

    setSending(true);
    setError("");

    const ciData: OfflineCheckIn = {
      latitude:  coords.lat,
      longitude: coords.lng,
      placeName: placeName.trim(),
      timestamp: new Date().toISOString(),
    };

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // Hors ligne → stocker localement
      const queue = loadCIQueue();
      queue.push(ciData);
      saveCIQueue(queue);
      setPendingCnt(queue.length);
      setSending(false);
      setOffline(true);
      setSuccess(true);
      console.log(`📦 Check-in stocké offline (${queue.length} en attente)`);
      setTimeout(() => { setShowModal(false); setSuccess(false); setOffline(false); setPlaceName(""); }, 2000);
      return;
    }

    // En ligne → envoyer via socket
    const socket = getSocket();

    const doSend = () => {
      socket.emit("check_in", ciData);
      setSending(false);
      setSuccess(true);
      setOffline(false);
      setTimeout(() => { setShowModal(false); setSuccess(false); setPlaceName(""); }, 1800);
    };

    if (socket.connected) {
      doSend();
    } else {
      socket.once("connect", doSend);
      socket.connect();
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={handleOpen}
        style={{
          position:     "fixed",
          bottom:       24,
          right:        24,
          zIndex:       100,
          width:        60,
          height:       60,
          borderRadius: "50%",
          background:   "linear-gradient(135deg, #065f46, #059669)",
          border:       "none",
          cursor:       "pointer",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          boxShadow:    "0 6px 24px rgba(6,95,70,0.45)",
          transition:   "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        title="Pointer ma position"
      >
        <MapPin size={26} color="white" />
        {pendingCnt > 0 && (
          <span style={{
            position:    "absolute",
            top:         -4,
            right:       -4,
            background:  "#f59e0b",
            color:       "white",
            borderRadius: "50%",
            width:        20,
            height:       20,
            fontSize:    11,
            fontWeight:  700,
            display:     "flex",
            alignItems:  "center",
            justifyContent: "center",
            border:      "2px solid white",
          }}>
            {pendingCnt}
          </span>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position:       "fixed",
            inset:          0,
            background:     "rgba(0,0,0,0.55)",
            display:        "flex",
            alignItems:     "flex-end",
            justifyContent: "center",
            zIndex:         200,
            padding:        "0 0 env(safe-area-inset-bottom)",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background:   "white",
              borderRadius: "24px 24px 0 0",
              width:        "100%",
              maxWidth:     480,
              padding:      "24px 24px 32px",
              boxShadow:    "0 -8px 40px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb", margin: "0 auto 20px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} color="#059669" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111827" }}>Pointer ma position</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                    {locating ? "Localisation en cours..." : coords ? "📡 Position GPS obtenue" : "Position non disponible"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Indicateur hors ligne */}
            {!navigator.onLine && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
                <WifiOff size={14} color="#d97706" />
                <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
                  Hors ligne — le pointage sera envoyé à la reconnexion
                </p>
              </div>
            )}

            {pendingCnt > 0 && (
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "6px 12px", marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
                  ⏳ {pendingCnt} pointage(s) en attente de synchronisation
                </p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Nom du lieu / pharmacie *
              </label>
              <input
                value={placeName}
                onChange={e => { setPlaceName(e.target.value); setError(""); }}
                placeholder="Ex : Pharmacie du Centre, CHU Cocody..."
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && !locating && !sending) handleSubmit(); }}
                style={{
                  width:        "100%",
                  border:       "1.5px solid #d1fae5",
                  borderRadius: 12,
                  padding:      "12px 16px",
                  fontSize:     14,
                  outline:      "none",
                  boxSizing:    "border-box",
                  fontFamily:   "system-ui",
                  background:   "#f9fafb",
                }}
              />
            </div>

            {coords && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 11, color: "#065f46", fontFamily: "monospace" }}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              </div>
            )}

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 12px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                ❌ {error}
              </div>
            )}

            {success ? (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            8,
                background:     offline ? "#fffbeb" : "#f0fdf4",
                border:         `1.5px solid ${offline ? "#fde68a" : "#bbf7d0"}`,
                borderRadius:   14,
                padding:        "14px",
                color:          offline ? "#92400e" : "#065f46",
                fontWeight:     700,
                fontSize:       15,
              }}>
                {offline ? <><WifiOff size={18} /> Stocké — sera envoyé à la reconnexion</> : <><Check size={20} /> Pointage envoyé !</>}
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={locating || sending || !coords || !placeName.trim()}
                style={{
                  width:          "100%",
                  background:     locating || sending || !coords || !placeName.trim()
                    ? "#d1fae5" : "linear-gradient(135deg, #065f46, #059669)",
                  color:          locating || !coords ? "#6b7280" : "white",
                  border:         "none",
                  borderRadius:   14,
                  padding:        "14px",
                  fontSize:       15,
                  fontWeight:     700,
                  cursor:         locating || sending || !coords || !placeName.trim() ? "not-allowed" : "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            8,
                  transition:     "all 0.15s",
                }}
              >
                {locating ? (
                  <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Localisation...</>
                ) : sending ? (
                  <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Envoi...</>
                ) : (
                  <><MapPin size={16} /> {navigator.onLine ? "Valider le pointage" : "Sauvegarder (hors ligne)"}</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}