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

// ── État de connexion ────────────────────────────────────────

export function isOnline(): boolean {
  return navigator.onLine;
}

// ── Écouter les changements de connexion ─────────────────────

export function onConnectionChange(
  callback: (online: boolean) => void,
): () => void {
  const handleOnline  = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online",  handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online",  handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// ── Sauvegarder un rapport hors ligne ────────────────────────

export function saveReportOffline(payload: any): void {
  const existing = getOfflineReportsSync();
  const report: OfflineReport = {
    id:        `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    payload,
    createdAt: Date.now(),
  };
  existing.push(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// ── Lecture synchrone (usage interne) ───────────────────────

function getOfflineReportsSync(): OfflineReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Récupérer les rapports en attente (async pour OfflineIndicator) ──

export async function getPendingReports(): Promise<OfflineReport[]> {
  return getOfflineReportsSync();
}

// ── Supprimer un rapport synchronisé ────────────────────────

function removeReport(id: string): void {
  const updated = getOfflineReportsSync().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ── Synchroniser les rapports en attente ────────────────────

export async function syncPendingReports(): Promise<SyncResult> {
  const reports = getOfflineReportsSync();
  let synced = 0;
  let failed = 0;

  for (const report of reports) {
    try {
      await api.post("/visit-reports", report.payload);
      removeReport(report.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

// ── Sync automatique (appelé dans DelegateView) ──────────────

export function setupAutoSync(
  onResult?: (result: SyncResult) => void,
): () => void {
  // Sync immédiate au montage si en ligne et rapports en attente
  if (isOnline() && getOfflineReportsSync().length > 0) {
    syncPendingReports().then((result) => {
      if (onResult) onResult(result);
    });
  }

  // Sync automatique quand la connexion revient
  const cleanup = onConnectionChange(async (nowOnline) => {
    if (!nowOnline || getOfflineReportsSync().length === 0) return;
    const result = await syncPendingReports();
    if (onResult) onResult(result);
  });

  return cleanup;
}