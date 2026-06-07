"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { ActionTooltip } from "@/components/action-tooltip";
import { Radio, RefreshCw } from "lucide-react";

export const SocketIndicator = () => {
  const { isConnected } = useSocket();
  const label = isConnected
    ? "Realtime connected"
    : "Realtime unavailable. Using message sync.";

  return (
    <ActionTooltip label={label} side="bottom">
      <div
        aria-label={label}
        className={
          isConnected
            ? "hidden h-7 shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-medium text-emerald-300 sm:inline-flex"
            : "hidden h-7 shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 px-2 text-xs font-medium text-zinc-300 sm:inline-flex"
        }
      >
        {isConnected ? (
          <Radio className="h-3.5 w-3.5" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
        )}
        {isConnected ? "Live" : "Sync"}
      </div>
    </ActionTooltip>
  )
}
