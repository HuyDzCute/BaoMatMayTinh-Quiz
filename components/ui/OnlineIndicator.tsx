"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OnlineIndicator() {
  const [online, setOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      setShowOfflineToast(false);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      <div
        className={`online-indicator ${online ? "is-online" : "is-offline"}`}
        title={online ? "Đang kết nối mạng" : "Mất kết nối mạng"}
        aria-label={online ? "Đang kết nối mạng" : "Mất kết nối mạng"}
      >
        {online ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span className="online-indicator-dot" aria-hidden="true" />
      </div>
      {showOfflineToast && (
        <div className="offline-banner" role="status">
          ⚠️ Mất kết nối mạng. Một số tính năng có thể không hoạt động.
        </div>
      )}
    </>
  );
}
