import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Clock, Users, Send, ToggleLeft, ToggleRight, Check, AlertCircle, X } from "lucide-react";
import api from "../../../services/api";

export default function EmailScheduleTab() {
  const qc = useQueryClient();
  const [hour,     setHour]     = useState("9");
  const [minute,   setMinute]   = useState("30");
  const [selected, setSelected] = useState<string[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [saved,    setSaved]    = useState(false);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["email-schedule"],
    queryFn:  () => api.get("/email-schedule").then((r) => r.data),
  });

  // Initialiser les valeurs depuis la config
  useState(() => {
    if (schedule) {
      setHour(String(schedule.hour));
      setMinute(String(schedule.minute).padStart(2, "0"));
      setSelected(schedule.recipients?.map((r: any) => r.userId) || []);
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-email"],
    queryFn:  () => api.get("/users").then((r) => r.data),
  });

  const adminsAndSuper = (users as any[]).filter((u) =>
    ["ADMIN", "SUPER_ADMIN"].includes(u.role)
  );

  const saveConfig = useMutation({
    mutationFn: (data: any) => api.post("/email-schedule", data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["email-schedule"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleActive = useMutation({
    mutationFn: () => api.patch("/email-schedule/toggle"),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["email-schedule"] }),
  });

  const testEmail = useMutation({
    mutationFn: () => api.post("/email-schedule/test"),
    onSuccess:  () => {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
    },
  });

  const toggleRecipient = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = () => {
    saveConfig.mutate({
      hour:         parseInt(hour),
      minute:       parseInt(minute),
      isActive:     true,
      recipientIds: selected,
    });
  };

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-700",
    ADMIN:       "bg-purple-100 text-purple-700",
  };
  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN:       "Admin",
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-3" />
      Chargement...
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Mail size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Email Automatique</h2>
            <p className="text-sm text-gray-400">Rapport quotidien des connexions délégués</p>
          </div>
        </div>
        {schedule && (
          <button
            onClick={() => toggleActive.mutate()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition
              ${schedule.isActive
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
          >
            {schedule.isActive
              ? <><ToggleRight size={20} /> Actif</>
              : <><ToggleLeft  size={20} /> Inactif</>
            }
          </button>
        )}
      </div>

      {/* Explication */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> Comment ça fonctionne
        </h3>
        <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside">
          <li>Chaque matin à l'heure choisie, un email est envoyé automatiquement</li>
          <li>Les <strong>Administrateurs</strong> reçoivent les infos de leur laboratoire uniquement</li>
          <li>Le <strong>Super Admin</strong> reçoit le rapport complet des 2 laboratoires</li>
          <li>Chaque email contient un <strong>fichier Excel</strong> avec nom, zone, heure de connexion</li>
        </ul>
      </div>

      {/* Heure d'envoi */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-green-600" />
          Heure d'envoi automatique
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-6 py-4">
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="bg-transparent text-3xl font-bold text-gray-800 outline-none cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-3xl font-bold text-gray-400">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="bg-transparent text-3xl font-bold text-gray-800 outline-none cursor-pointer"
            >
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={parseInt(m)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            <p>Envoi chaque jour à</p>
            <p className="text-xl font-bold text-gray-800">
              {String(hour).padStart(2, "0")}h{String(minute).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Destinataires */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} className="text-green-600" />
            Destinataires
          </h3>
          <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {selected.length} sélectionné(s)
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          L'email sera envoyé à l'adresse rattachée à leur profil.
        </p>

        <div className="space-y-2">
          {adminsAndSuper.map((u: any) => {
            const isSelected = selected.includes(u.id);
            const labs = u.adminLabs?.map((al: any) => al.laboratory?.name).filter(Boolean).join(", ");
            return (
              <button
                key={u.id}
                onClick={() => toggleRecipient(u.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition
                  ${isSelected
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100 bg-gray-50 hover:border-gray-300"
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${isSelected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {isSelected
                    ? <Check size={18} />
                    : `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</p>
                  {labs && <p className="text-xs text-green-600 font-medium">{labs.toUpperCase()}</p>}
                </div>
                <div className="text-right flex-shrink-0 text-xs">
                  <p className="text-gray-400">Recevra</p>
                  <p className="font-semibold text-gray-700">
                    {u.role === "SUPER_ADMIN" ? "Tous les labos" : labs?.toUpperCase() || "Son labo"}
                  </p>
                </div>
              </button>
            );
          })}
          {adminsAndSuper.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun administrateur disponible</div>
          )}
        </div>
      </div>

      {/* Aperçu envoi */}
      {selected.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <h4 className="font-semibold text-green-800 text-sm mb-3 flex items-center gap-2">
            <Mail size={14} /> Aperçu des envois
          </h4>
          <div className="space-y-1.5">
            {adminsAndSuper
              .filter((u: any) => selected.includes(u.id))
              .map((u: any) => {
                const labs = u.adminLabs?.map((al: any) => al.laboratory?.name).filter(Boolean);
                return (
                  <div key={u.id} className="flex items-center gap-2 text-sm text-green-700">
                    <Mail size={12} className="flex-shrink-0" />
                    <span className="font-medium truncate">{u.email}</span>
                    <span className="text-green-400 flex-shrink-0">→</span>
                    <span className="flex-shrink-0 text-xs">
                      {u.role === "SUPER_ADMIN"
                        ? "Rapport global (tous labos)"
                        : labs?.map((l: string) => l.toUpperCase()).join(" + ") || "Son labo"
                      }
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Boutons actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saveConfig.isPending || selected.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-60 shadow-sm"
        >
          {saved
            ? <><Check size={18} /> Sauvegardé !</>
            : saveConfig.isPending
            ? "Sauvegarde..."
            : <><Check size={18} /> Enregistrer</>
          }
        </button>

        <button
          onClick={() => testEmail.mutate()}
          disabled={testEmail.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-60"
        >
          <Send size={16} />
          {testSent
            ? "✅ Envoyé !"
            : testEmail.isPending
            ? "Envoi..."
            : "Tester l'envoi"
          }
        </button>
      </div>

      {/* Statut */}
      {schedule && (
        <div className={`rounded-2xl p-4 border text-sm ${
          schedule.isActive
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-gray-50 border-gray-200 text-gray-500"
        }`}>
          {schedule.isActive
            ? <p>✅ Actif — envoi chaque jour à <strong>{String(schedule.hour).padStart(2,"0")}h{String(schedule.minute).padStart(2,"0")}</strong> — <strong>{schedule.recipients?.length || 0}</strong> destinataire(s)</p>
            : <p>⏸️ Désactivé — cliquez sur "Inactif" pour réactiver</p>
          }
        </div>
      )}
    </div>
  );
}
