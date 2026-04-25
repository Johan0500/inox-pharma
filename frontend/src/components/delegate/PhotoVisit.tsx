import { useState, useRef, useCallback } from "react";
import { Camera, X, Upload, Check, Image, Trash2, Loader } from "lucide-react";
import api from "../../services/api";

interface PhotoVisitProps {
  reportId?: string;
  onPhotosChange?: (photos: string[]) => void;
  maxPhotos?: number;
}

interface UploadedPhoto {
  id:        string;
  url:       string;
  caption:   string;
  uploading: boolean;
  error:     string;
}

export default function PhotoVisit({ onPhotosChange, maxPhotos = 5 }: PhotoVisitProps) {
  const [photos,   setPhotos]   = useState<UploadedPhoto[]>([]);
  const [showCam,  setShowCam]  = useState(false);
  const [stream,   setStream]   = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [caption,  setCaption]  = useState("");

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // ── Ouvrir la caméra ────────────────────────────────────
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      setShowCam(true);
      setCaptured(null);
      setCaption("");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Fallback: sélecteur de fichiers si pas de caméra
      fileRef.current?.click();
    }
  };

  const closeCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setShowCam(false);
    setCaptured(null);
  }, [stream]);

  // ── Prendre une photo ───────────────────────────────────
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
  };

  // ── Importer depuis la galerie ──────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCaptured(reader.result as string);
      setShowCam(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Valider et "uploader" la photo (base64 stockée localement) ─
  const confirmPhoto = () => {
    if (!captured) return;
    const newPhoto: UploadedPhoto = {
      id:        `photo_${Date.now()}`,
      url:       captured,
      caption:   caption.trim(),
      uploading: false,
      error:     "",
    };
    const updated = [...photos, newPhoto];
    setPhotos(updated);
    onPhotosChange?.(updated.map(p => p.url));
    closeCamera();
    setCaption("");
  };

  const removePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    onPhotosChange?.(updated.map(p => p.url));
  };

  const updateCaption = (id: string, cap: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption: cap } : p));
  };

  const canAdd = photos.length < maxPhotos;

  return (
    <div>
      {/* Photos déjà prises */}
      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1.5px solid #d1fae5", background: "#f9fafb" }}>
              <img src={photo.url} alt={photo.caption || "Photo visite"} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              <button
                onClick={() => removePhoto(photo.id)}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(220,38,38,0.85)", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={12} color="white" />
              </button>
              <input
                value={photo.caption}
                onChange={e => updateCaption(photo.id, e.target.value)}
                placeholder="Légende..."
                style={{ width: "100%", border: "none", borderTop: "1px solid #e5e7eb", padding: "4px 6px", fontSize: 10, background: "white", boxSizing: "border-box", outline: "none" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Boutons d'ajout */}
      {canAdd && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={openCamera}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "#f0fdf4", border: "1.5px dashed #6ee7b7", borderRadius: 12, fontSize: 13, color: "#059669", cursor: "pointer", fontWeight: 600 }}>
            <Camera size={16} /> Prendre une photo
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "#f0fdf4", border: "1.5px dashed #6ee7b7", borderRadius: 12, fontSize: 13, color: "#059669", cursor: "pointer", fontWeight: 600 }}>
            <Image size={16} /> Galerie
          </button>
        </div>
      )}
      {!canAdd && <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>Maximum {maxPhotos} photos atteint</p>}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileSelect} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Modal caméra / aperçu */}
      {showCam && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <button onClick={closeCamera} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={20} color="white" />
          </button>

          {!captured ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxWidth: 480, borderRadius: 16, background: "#000" }} />
              <button
                onClick={takePhoto}
                style={{ marginTop: 24, width: 70, height: 70, borderRadius: "50%", background: "white", border: "4px solid rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={28} color="#059669" />
              </button>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 12 }}>Appuyez pour capturer</p>
            </>
          ) : (
            <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
              <img src={captured} alt="Aperçu" style={{ width: "100%", borderRadius: 16 }} />
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Légende (optionnel) — ex: Vitrine pharmacie Cocody"
                style={{ width: "100%", border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 13, background: "rgba(255,255,255,0.1)", color: "white", outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setCaptured(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  Reprendre
                </button>
                <button onClick={confirmPhoto} style={{ flex: 2, padding: "12px 0", borderRadius: 12, background: "linear-gradient(135deg,#065f46,#059669)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Check size={16} /> Utiliser cette photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}