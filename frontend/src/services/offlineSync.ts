import api from "./api";

const STORAGE_KEY = "offline_reports";

export interface OfflineReport {
  id:        string;
  payload:   any;
  createdAt: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
}

// ── Sauvegarder un rapport hors ligne ────────────────────────

export function saveOfflineReport(payload: any): void {
  const existing = getOfflineReports();
  const report: OfflineReport = {
    id:        `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    payload,
    createdAt: Date.now(),
  };
  existing.push(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// ── Récupérer les rapports en attente ────────────────────────

export function getOfflineReports(): OfflineReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Supprimer un rapport synchronisé ────────────────────────

function removeOfflineReport(id: string): void {
  const updated = getOfflineReports().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ── Synchroniser les rapports hors ligne ────────────────────

export async function syncOfflineReports(): Promise<SyncResult> {
  const reports = getOfflineReports();
  let synced = 0;
  let failed = 0;

  for (const report of reports) {
    try {
      await api.post("/visit-reports", report.payload);
      removeOfflineReport(report.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

// ── Sync automatique (appelé au montage du composant) ────────

export function setupAutoSync(
  onResult?: (result: SyncResult) => void,
): () => void {
  // Sync immédiate au montage si en ligne
  if (navigator.onLine && getOfflineReports().length > 0) {
    syncOfflineReports().then((result) => {
      if (onResult) onResult(result);
    });
  }

  // Sync quand la connexion revient
  const handleOnline = async () => {
    if (getOfflineReports().length === 0) return;
    const result = await syncOfflineReports();
    if (onResult) onResult(result);
  };

  window.addEventListener("online", handleOnline);

  // Retourne la fonction de cleanup pour useEffect
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}