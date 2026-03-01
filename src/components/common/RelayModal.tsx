"use client";

import React from "react";
import { X, Server, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useRelayStatus } from "@/hooks/useRelayStatus";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";

interface RelayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getStatusColor = (status: NDKRelayStatus) => {
  switch (status) {
    case NDKRelayStatus.CONNECTED:
      return "text-green-500";
    case NDKRelayStatus.CONNECTING:
      return "text-yellow-500";
    case NDKRelayStatus.DISCONNECTED:
      return "text-red-500";
    default:
      return "text-gray-500";
  }
};

const getStatusLabel = (status: NDKRelayStatus) => {
  switch (status) {
    case NDKRelayStatus.CONNECTED:
      return "Connected";
    case NDKRelayStatus.CONNECTING:
      return "Connecting";
    case NDKRelayStatus.DISCONNECTED:
      return "Disconnected";
    default:
      return "Unknown";
  }
};

export const RelayModal: React.FC<RelayModalProps> = ({ isOpen, onClose }) => {
  const { relays } = useRelayStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2 text-blue-500">
            <Server size={20} />
            <h3 className="font-bold text-lg">Network Status</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <p className="font-bold mb-1">User Sovereignty & Transparency</p>
            Nostr is a decentralized protocol. Your data is stored across multiple independent servers (relays). Sapa connects to these relays to fetch and publish your content.
          </div>

          <div className="space-y-2">
            {relays.map((relay) => (
              <div 
                key={relay.url} 
                className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate pr-4">{relay.url}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(relay.status)}`}>
                    {getStatusLabel(relay.status)}
                  </span>
                </div>
                <div className="shrink-0">
                  {relay.status === NDKRelayStatus.CONNECTED ? (
                    <Wifi size={16} className="text-green-500" />
                  ) : (
                    <WifiOff size={16} className="text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={16} />
            Reconnect All
          </button>
        </div>
      </div>
    </div>
  );
};
