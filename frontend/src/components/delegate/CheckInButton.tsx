import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { MapPin, X, Check, Loader } from "lucide-react";

export default function CheckInButton() {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [placeName, setPlaceName]   = useState("");
  const [locating,  setLocating]    = useState(false);
  const [sending,   setSending]     = useState(false);
  const [success,   setSuccess]     = useState(false);
  const [error,     setError]       = useState("");
  const [coords,    setCoords]      = useState<{ lat: number; lng: number } | null>(null);

  // Connexion socket partagée
  const getSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;
    const s = io(
      import.meta.env.VITE_SOCKET_URL || "https://inox-pharma-0gkr.onrender.com",
      { auth: { token }, transports: ["websocket", "polling"] }
    );
    socketRef.current = s;
    return s;
  }, [token]);

  useEffect(() => {
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const handleOpen = () => {
    setShowModal(true);
    setPlaceName("");
    setError("");
    setSuccess(false);
    setCoords(null);
    setLocating(true);

    // Obtenir la position actuelle
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError("Impossible d'obtenir votre position GPS. Vérifiez que le GPS est activé.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = () => {
    if (!coords) { setError("Position GPS non disponible."); return; }
    if (!placeName.trim()) { setError("Entrez le nom du lieu."); return; }

    setSending(true);
    setError("");

    const socket = getSocket();

    const doSend = () => {
      socket.emit("check_in", {
        latitude:  coords.lat,
        longitude: coords.lng,
        placeName: placeName.trim(),
        delegateName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
      setSuccess(true);
      setSending(false);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setPlaceName("");
      }, 1800);
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
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #065f46, #059669)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 24px rgba(6,95,70,0.45)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        title="Pointer ma position"
      >
        <MapPin size={26} color="white" />
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 200, padding: "0 0 env(safe-area-inset-bottom)",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px 24px 0 0",
              width: "100%",
              maxWidth: 480,
              padding: "24px 24px 32px",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb", margin: "0 auto 20px" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} color="#059669" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111827" }}>Pointer ma position</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                    {locating ? "Localisation en cours..." : coords ? `📡 Position GPS obtenue` : "Position non disponible"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Champ nom du lieu */}
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
                  width: "100%",
                  border: "1.5px solid #d1fae5",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "system-ui",
                  background: "#f9fafb",
                }}
              />
            </div>

            {/* Coordonnées GPS affichées */}
            {coords && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f0fdf4", borderRadius: 10, padding: "8px 12px", marginBottom: 16,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 11, color: "#065f46", fontFamily: "monospace" }}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 12px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                ❌ {error}
              </div>
            )}

            {/* Bouton valider */}
            {success ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14,
                padding: "14px", color: "#065f46", fontWeight: 700, fontSize: 15,
              }}>
                <Check size={20} /> Pointage envoyé !
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={locating || sending || !coords || !placeName.trim()}
                style={{
                  width: "100%",
                  background: locating || sending || !coords || !placeName.trim()
                    ? "#d1fae5" : "linear-gradient(135deg, #065f46, #059669)",
                  color: locating || !coords ? "#6b7280" : "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: locating || sending || !coords || !placeName.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s",
                }}
              >
                {locating ? (
                  <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Localisation...</>
                ) : sending ? (
                  <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Envoi...</>
                ) : (
                  <><MapPin size={16} /> Valider le pointage</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
