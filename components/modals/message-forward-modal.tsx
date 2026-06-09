"use client";

import axios from "axios";
import qs from "query-string";
import { FileText, Forward, Loader2, Search, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

const FORWARD_MESSAGE_PREFIX = "arcnest-forward:v1:";

type ForwardTarget = {
  id: string;
  type: "channel" | "conversation";
  label: string;
  description: string;
  apiUrl: string;
  query: Record<string, string>;
};

const getForwardBody = (content: string) => {
  if (content.startsWith(FORWARD_MESSAGE_PREFIX)) {
    try {
      const payload = JSON.parse(content.slice(FORWARD_MESSAGE_PREFIX.length));
      return typeof payload?.content === "string" ? payload.content : content;
    } catch {
      return content;
    }
  }

  return content;
};

export const MessageForwardModal = () => {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "messageForward";
  const message = data.forwardMessage;
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    let isMounted = true;

    const loadTargets = async () => {
      setIsLoadingTargets(true);
      setError("");

      try {
        const response = await fetch("/api/forward-targets");

        if (!response.ok) {
          throw new Error("Could not load forward targets.");
        }

        const payload = await response.json() as { items?: ForwardTarget[] };

        if (!isMounted) {
          return;
        }

        setTargets(payload.items || []);
        setSelectedTargetId(payload.items?.[0]?.id || "");
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Could not load forward targets.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTargets(false);
        }
      }
    };

    loadTargets();

    return () => {
      isMounted = false;
    };
  }, [isModalOpen]);

  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return targets;
    }

    return targets.filter((target) => (
      `${target.label} ${target.description}`.toLowerCase().includes(normalizedSearch)
    ));
  }, [search, targets]);

  const selectedTarget = targets.find((target) => target.id === selectedTargetId);
  const previewContent = message ? getForwardBody(message.content) : "";

  const handleClose = () => {
    setTargets([]);
    setSelectedTargetId("");
    setSearch("");
    setError("");
    setIsForwarding(false);
    onClose();
  };

  const forwardMessage = async () => {
    if (!message || !selectedTarget) {
      return;
    }

    setIsForwarding(true);
    setError("");

    try {
      const endpoint = qs.stringifyUrl({
        url: selectedTarget.apiUrl,
        query: selectedTarget.query,
      });
      const payload = {
        kind: "forward",
        from: message.authorName,
        content: getForwardBody(message.content),
        sourceType: message.sourceType,
        sourceId: message.sourceId,
      };

      await axios.post(endpoint, {
        content: `${FORWARD_MESSAGE_PREFIX}${JSON.stringify(payload)}`,
        fileUrl: message.fileUrl || undefined,
      });

      router.refresh();
      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not forward message.");
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden bg-white p-0 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Forward className="h-5 w-5 text-indigo-500" />
            Forward message
          </DialogTitle>
          <DialogDescription>
            Choose where this message should be sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 text-[11px] font-bold uppercase text-zinc-500">
              From {message?.authorName || "Message"}
            </div>
            {message?.fileUrl && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                Attachment included
              </div>
            )}
            <p className="line-clamp-3 break-words text-sm text-zinc-700 dark:text-zinc-200">
              {previewContent || "Attachment"}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
            {isLoadingTargets && (
              <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading chats
              </div>
            )}
            {!isLoadingTargets && filteredTargets.length === 0 && (
              <div className="py-8 text-center text-sm text-zinc-500">
                No chats found.
              </div>
            )}
            {!isLoadingTargets && filteredTargets.map((target) => {
              const isSelected = selectedTargetId === target.id;

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setSelectedTargetId(target.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition",
                    isSelected
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-black",
                    isSelected ? "bg-indigo-500 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {target.type === "channel" ? "#" : "@"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{target.label}</div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{target.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-sm font-semibold text-rose-500">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="mt-2 bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!selectedTarget || isForwarding} onClick={forwardMessage}>
            {isForwarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
