import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { isOnline, onConnectionChange, syncPendingReports, getPendingReports } from "../../services/offlineSync";

export default function OfflineIndicator() {
  const [online,       setOnline]       = useState(isOnline());
  const [syncing,      setSyncing]      = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncResult,   setSyncResult]   = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    const cleanup = onConnectionChange(async (nowOnline) => {
      setOnline(nowOnline);
      if (nowOnline) {
        const pending = await getPendingReports();
        if (pending.length > 0) {
          setSyncing(true);
          const result = await syncPendingReports();
          setSyncing(false);
          setSyncResult(result);
          setPendingCount(0);
          setTimeout(() => setSyncResult(null), 4000);
        }
      }
    });

    // Vérifier les rapports en attente
    getPendingReports().then((p) => setPendingCount(p.length));

    return cleanup;
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const result = await syncPendingReports();
    setSyncing(false);
    setSyncResult(result);
    setPendingCount(0);
    setTimeout(() => setSyncResult(null), 4000);
  };

  if (online && pendingCount === 0 && !syncResult) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-medium transition-all
      ${!online          ? "bg-red-600 text-white"    :
        syncResult       ? "bg-green-600 text-white"   :
        pendingCount > 0 ? "bg-orange-500 text-white"  :
        "bg-gray-800 text-white"
      }`}
    >
      {!online ? (
        <>
          <WifiOff size={16} />
          <span>Hors ligne — {pendingCount > 0 ? `${pendingCount} rapport(s) en attente` : "Mode hors ligne"}</span>
        </>
      ) : syncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Synchronisation en cours...</span>
        </>
      ) : syncResult ? (
        <>
          <CheckCircle size={16} />
          <span>{syncResult.synced} rapport(s) synchronisé(s) !</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Wifi size={16} />
          <span>{pendingCount} rapport(s) à synchroniser</span>
          <button onClick={handleManualSync}
            className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg text-xs">
            Sync maintenant
          </button>
        </>
      ) : null}
    </div>
  );
}