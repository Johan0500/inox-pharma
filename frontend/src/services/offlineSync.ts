import api from "./api";

const DB_NAME    = "inox_pharma_offline";
const DB_VERSION = 1;

// ── IndexedDB Setup ──────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror   = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("pending_reports")) {
        const store = db.createObjectStore("pending_reports", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("pending_messages")) {
        db.createObjectStore("pending_messages", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

// ── Sauvegarder un rapport en attente ────────────────────────
export async function saveReportOffline(reportData: any): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction("pending_reports", "readwrite");
    const store = tx.objectStore("pending_reports");
    const req   = store.add({
      ...reportData,
      createdAt: new Date().toISOString(),
      synced:    false,
    });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror   = () => reject(req.error);
  });
}

// ── Récupérer tous les rapports en attente ───────────────────
export async function getPendingReports(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction("pending_reports", "readonly");
    const store = tx.objectStore("pending_reports");
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result.filter((r) => !r.synced));
    req.onerror   = () => reject(req.error);
  });
}

// ── Marquer un rapport comme synchronisé ────────────────────
export async function markReportSynced(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction("pending_reports", "readwrite");
    const store = tx.objectStore("pending_reports");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const report = getReq.result;
      if (report) {
        report.synced = true;
        const putReq  = store.put(report);
        putReq.onsuccess = () => resolve();
        putReq.onerror   = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ── Supprimer un rapport synchronisé ────────────────────────
export async function deleteReport(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction("pending_reports", "readwrite");
    const store = tx.objectStore("pending_reports");
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Synchroniser tous les rapports en attente ────────────────
export async function syncPendingReports(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingReports();
  let synced = 0, failed = 0;

  for (const report of pending) {
    try {
      await api.post("/reports", {
        doctorName:    report.doctorName,
        specialty:     report.specialty,
        pharmacyId:    report.pharmacyId,
        productsShown: report.productsShown,
        notes:         report.notes,
        aiSummary:     report.aiSummary,
      });
      await deleteReport(report.id);
      synced++;
      console.log(`✅ Rapport synchronisé: ${report.doctorName}`);
    } catch (err) {
      console.error(`❌ Échec sync rapport ${report.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}

// ── Vérifier la connexion internet ──────────────────────────
export function isOnline(): boolean {
  return navigator.onLine;
}

// ── Écouter les changements de connexion ────────────────────
export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const handleOnline  = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener("online",  handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online",  handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// ── Sync automatique quand connexion rétablie ────────────────
export function setupAutoSync(onSyncComplete?: (result: { synced: number; failed: number }) => void) {
  const cleanup = onConnectionChange(async (online) => {
    if (online) {
      console.log("🌐 Connexion rétablie — synchronisation...");
      const result = await syncPendingReports();
      if (result.synced > 0 || result.failed > 0) {
        console.log(`📊 Sync: ${result.synced} réussis, ${result.failed} échoués`);
        onSyncComplete?.(result);
      }
    }
  });
  return cleanup;
}