"use client";

import { Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface MessageRequestBannerProps {
  conversationId: string;
  isRecipient: boolean;
  name: string;
}

export const MessageRequestBanner = ({
  conversationId,
  isRecipient,
  name,
}: MessageRequestBannerProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const updateRequest = async (action: "accept" | "ignore") => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/message-request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        console.log(await response.text());
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shrink-0 border-b border-zinc-200 bg-zinc-100/80 px-4 py-3 dark:border-zinc-700 dark:bg-[#2B2D31]">
      <div className="flex flex-col gap-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {isRecipient ? `${name} sent a message request.` : `Waiting for ${name} to accept.`}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              {isRecipient
                ? "Accept to move this conversation into your inbox, or ignore to stop replies."
                : "They can accept, ignore, or block this request."}
            </p>
          </div>
        </div>

        {isRecipient && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isLoading}
              onClick={() => updateRequest("accept")}
              className="h-9 gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isLoading}
              onClick={() => updateRequest("ignore")}
              className="h-9 gap-2 border border-zinc-300 dark:border-zinc-700"
            >
              <X className="h-4 w-4" />
              Ignore
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
