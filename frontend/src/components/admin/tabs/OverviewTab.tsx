import { useQuery } from "@tanstack/react-query";
import { Users, Building2, FileText, MapPin, TrendingUp, Clock, FlaskConical } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function OverviewTab() {
  const { user } = useAuth();
  const selectedLab = localStorage.getItem("selectedLab");
  const isGlobal = !selectedLab || selectedLab === "all";

  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard", selectedLab],
    queryFn:  () => api.get("/stats").then(r => r.data),
    refetchInterval: 30000,
  });

  const labColor = selectedLab === "lic-pharma" ? "#065f46"
    : selectedLab === "croient" ? "#1e40af"
    : "#064e3b";

  const cards = [
    { label: "Total Délégués",    value: stats?.totalDelegates ?? "—",                    icon: Users,     color: "#3b82f6" },
    { label: "Délégués actifs",   value: stats?.activeDelegates ?? "—",                   icon: MapPin,    color: "#22c55e" },
    { label: "Rapports de visite",value: stats?.totalReports?.toLocaleString() ?? "—",    icon: FileText,  color: "#8b5cf6" },
    { label: "Pharmacies",        value: stats?.totalPharmacies?.toLocaleString() ?? "—", icon: Building2, color: "#f97316" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1f2937" }}>
            Bonjour, {user?.firstName} 👋
          </h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        {selectedLab && selectedLab !== "all" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: `${labColor}15`, border: `1px solid ${labColor}30`,
            borderRadius: 12, padding: "8px 16px",
          }}>
            <FlaskConical size={16} color={labColor} />
            <span style={{ color: labColor, fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>
              {selectedLab}
            </span>
          </div>
        )}
        {isGlobal && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #d1fae5",
            borderRadius: 12, padding: "8px 16px",
            color: "#064e3b", fontWeight: 700, fontSize: 13,
          }}>
            🌐 Vue globale — tous laboratoires
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: "white", borderRadius: 16, padding: 20,
            border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#1f2937" }}>{value}</p>
              </div>
              <div style={{
                background: `${color}15`, borderRadius: 12, padding: 10,
              }}>
                <Icon size={20} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vue globale — comparaison labos */}
      {isGlobal && user?.role === "SUPER_ADMIN" && stats?.byLab && (
        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
          padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1f2937" }}>
            📊 Comparaison par laboratoire
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(stats.byLab as any[]).map((lab: any) => (
              <div key={lab.name} style={{
                background: "#f8fafc", borderRadius: 12, padding: 16,
                border: `2px solid ${lab.name === "lic-pharma" ? "#065f46" : "#1e40af"}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FlaskConical size={16} color={lab.name === "lic-pharma" ? "#065f46" : "#1e40af"} />
                  <span style={{
                    fontWeight: 700, fontSize: 13, textTransform: "uppercase",
                    color: lab.name === "lic-pharma" ? "#065f46" : "#1e40af",
                  }}>
                    {lab.name}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Délégués", value: lab.delegates },
                    { label: "Actifs",   value: lab.active },
                    { label: "Rapports", value: lab.reports },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1f2937" }}>{item.value ?? "—"}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rapports récents */}
      {stats?.recentReports?.length > 0 && (
        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
          overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6",
            display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} color="#3b82f6" />
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1f2937" }}>
              Derniers rapports de visite
            </h3>
          </div>
          {stats.recentReports.map((r: any) => (
            <div key={r.id} style={{
              padding: "12px 20px", borderTop: "1px solid #f9fafb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1f2937" }}>{r.doctorName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                  {r.delegate?.user?.firstName} {r.delegate?.user?.lastName}
                  {r.laboratory && ` — ${r.laboratory.name}`}
                  {r.pharmacy && ` — ${r.pharmacy.nom}`}
                </p>
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                {format(new Date(r.visitDate), "dd/MM HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bannière */}
      <div style={{
        background: `linear-gradient(135deg, ${labColor} 0%, ${labColor}cc 100%)`,
        borderRadius: 16, padding: 24, color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <TrendingUp size={20} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>INOX PHARMA</h3>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.6 }}>
          Bienvenue sur votre tableau de bord. Gérez vos délégués, suivez leurs déplacements
          en temps réel et consultez tous les rapports de visites médicales.
        </p>
        {user?.role === "SUPER_ADMIN" && (
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
            ✦ Mode Super Administrateur — {isGlobal ? "Vue globale tous laboratoires" : `Filtré sur ${selectedLab}`}
          </p>
        )}
      </div>
    </div>
  );
}