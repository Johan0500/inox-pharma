import { useState, useEffect } from "react";
import { Bell, BellOff }       from "lucide-react";
import {
  registerPushNotifications,
  unregisterPushNotifications,
  isPushEnabled,
} from "../../services/pushNotifications";

export default function PushNotificationToggle() {
  const [enabled,  setEnabled]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    isPushEnabled().then(setEnabled);
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await unregisterPushNotifications();
        setEnabled(false);
      } else {
        const success = await registerPushNotifications();
        setEnabled(success);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition
        ${enabled
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } disabled:opacity-60`}
      title={enabled ? "Désactiver les notifications" : "Activer les notifications"}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : enabled ? (
        <Bell size={16} className="text-green-600" />
      ) : (
        <BellOff size={16} />
      )}
      {enabled ? "Notifs activées" : "Activer notifs"}
    </button>
  );
}