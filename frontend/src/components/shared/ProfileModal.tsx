import { useState, useRef }   from "react";
import { useMutation }        from "@tanstack/react-query";
import { X, Camera, Check, Loader2, User } from "lucide-react";
import api          from "../../services/api";
import { useAuth }  from "../../contexts/AuthContext";

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName,  setLastName]  = useState(user?.lastName  || "");
  const [avatar,    setAvatar]    = useState<string | null>((user as any)?.avatar || null);
  const [preview,   setPreview]   = useState<string | null>((user as any)?.avatar || null);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const saveProfile = useMutation({
    mutationFn: (data: any) => api.patch("/users/me/profile", data),
    onSuccess: (res) => {
      updateUser({
        firstName: res.data.firstName,
        lastName:  res.data.lastName,
        ...(res.data.avatar !== undefined ? { avatar: res.data.avatar } as any : {}),
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    },
    onError: (err: any) => setError(err.response?.data?.error || "Erreur lors de la sauvegarde"),
  });

  // Lire le fichier image et le convertir en base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setAvatar(base64);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim())
      return setError("Prénom et nom requis");
    saveProfile.mutate({ firstName, lastName, avatar });
  };

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 20, width: "100%", maxWidth: 440,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #064e3b, #059669)",
          padding: "24px 24px 60px",
          position: "relative",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>
                Mon Profil
              </h3>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                Modifier vos informations personnelles
              </p>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Avatar centré qui dépasse */}
          <div style={{
            position: "absolute", bottom: -36, left: "50%", transform: "translateX(-50%)",
          }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: "4px solid white",
                background: preview ? "transparent" : "linear-gradient(135deg, #064e3b, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}>
                {preview
                  ? <img src={preview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>{initials || <User size={28} />}</span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#059669", border: "2px solid white",
                  cursor: "pointer", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Camera size={12} />
              </button>
              <input
                ref={fileRef} type="file" accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ padding: "52px 24px 24px" }}>
          {/* Email (non modifiable) */}
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{user?.email}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
              {user?.role === "SUPER_ADMIN" ? "Super Administrateur"
               : user?.role === "ADMIN" ? "Administrateur"
               : "Délégué Médical"}
            </p>
          </div>

          {success ? (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 12, padding: 16, textAlign: "center",
            }}>
              <Check size={24} color="#059669" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, color: "#065f46", fontWeight: 600 }}>
                Profil mis à jour avec succès !
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  background: "#fee2e2", border: "1px solid #fca5a5",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                  fontSize: 13, color: "#dc2626",
                }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280",
                    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Prénom
                  </label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #d1fae5",
                      borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280",
                    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Nom
                  </label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #d1fae5",
                      borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16, textAlign: "center" }}>
                📷 Cliquez sur l'icône caméra pour changer votre photo (max 2 Mo)
              </p>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={saveProfile.isPending} style={{
                  flex: 1, padding: "11px",
                  background: "linear-gradient(135deg, #064e3b, #059669)",
                  border: "none", borderRadius: 12, color: "white",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: saveProfile.isPending ? 0.7 : 1,
                }}>
                  {saveProfile.isPending
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sauvegarde...</>
                    : <><Check size={15} /> Sauvegarder</>
                  }
                </button>
                <button type="button" onClick={onClose} style={{
                  padding: "11px 20px", borderRadius: 12,
                  border: "1px solid #d1d5db", background: "white",
                  color: "#6b7280", fontSize: 13, cursor: "pointer",
                }}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}