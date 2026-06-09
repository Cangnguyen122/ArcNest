"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import qs from "query-string";
import { ArrowUpRight, MoreVertical, Pin, Search, Share2, Trash2, User, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type HeaderMessageResult = {
  id: string;
  content: string;
  createdAt: string;
  member: {
    profile: {
      name: string;
    };
  };
};

interface ChatHeaderActionsProps {
  apiUrl: string;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  serverId: string;
  sharingDisabled: boolean;
}

const fetchHeaderMessages = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load messages");
  }

  return response.json() as Promise<{ items: HeaderMessageResult[] }>;
};

const getSearchScore = (content: string, query: string) => {
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedContent === normalizedQuery) {
    return 0;
  }

  if (normalizedContent.startsWith(normalizedQuery)) {
    return 1;
  }

  const wordStart = normalizedContent
    .split(/\s+/)
    .some((word) => word.startsWith(normalizedQuery));

  if (wordStart) {
    return 2;
  }

  return 3;
};

const renderHighlightedText = (content: string, query?: string) => {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return content;
  }

  const index = content.toLowerCase().indexOf(normalizedQuery.toLowerCase());

  if (index === -1) {
    return content;
  }

  return (
    <>
      {content.slice(0, index)}
      <mark className="rounded-sm bg-amber-300/70 px-0.5 text-zinc-950">
        {content.slice(index, index + normalizedQuery.length)}
      </mark>
      {content.slice(index + normalizedQuery.length)}
    </>
  );
};

const MessageResults = ({
  items,
  emptyText,
  searchTerm,
  onSelect,
}: {
  items?: HeaderMessageResult[];
  emptyText: string;
  searchTerm?: string;
  onSelect: (messageId: string) => void;
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="px-1 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {items.map((message) => (
        <button
          key={message.id}
          type="button"
          onClick={() => onSelect(message.id)}
          className="group w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-amber-500/50 dark:hover:bg-zinc-800"
        >
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {message.member.profile.name}
            </p>
            <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
              {format(new Date(message.createdAt), "d MMM, HH:mm")}
            </span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400 opacity-0 transition group-hover:opacity-100" />
          </div>
          <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-600 dark:text-zinc-300">
            {renderHighlightedText(message.content, searchTerm)}
          </p>
        </button>
      ))}
    </div>
  );
};

export const ChatHeaderActions = ({
  apiUrl,
  paramKey,
  paramValue,
  serverId,
  sharingDisabled,
}: ChatHeaderActionsProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pinOpen, setPinOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isMutatingConversation, setIsMutatingConversation] = useState(false);
  const [isMutatingSharing, setIsMutatingSharing] = useState(false);
  const [localSharingDisabled, setLocalSharingDisabled] = useState(sharingDisabled);
  const canMutateConversation = paramKey === "conversationId";

  const pinnedUrl = useMemo(() => qs.stringifyUrl({
    url: apiUrl,
    query: {
      [paramKey]: paramValue,
      pinned: true,
    }
  }), [apiUrl, paramKey, paramValue]);

  const searchUrl = useMemo(() => qs.stringifyUrl({
    url: apiUrl,
    query: {
      [paramKey]: paramValue,
      search,
    }
  }), [apiUrl, paramKey, paramValue, search]);

  const pinnedQuery = useQuery({
    queryKey: ["chat-header-pinned", paramValue],
    queryFn: () => fetchHeaderMessages(pinnedUrl),
    enabled: pinOpen,
  });

  const searchQuery = useQuery({
    queryKey: ["chat-header-search", paramValue, search],
    queryFn: () => fetchHeaderMessages(searchUrl),
    enabled: searchOpen && search.trim().length >= 2,
  });

  const sortedSearchItems = useMemo(() => {
    const items = searchQuery.data?.items || [];

    return [...items].sort((first, second) => {
      const scoreDifference = getSearchScore(first.content, search) - getSearchScore(second.content, search);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [search, searchQuery.data?.items]);

  const jumpToMessage = (messageId: string) => {
    window.dispatchEvent(new CustomEvent(`chat:${paramValue}:jump-message`, {
      detail: {
        messageId,
      },
    }));
    setPinOpen(false);
    setSearchOpen(false);
  };

  const clearHistory = async () => {
    if (!canMutateConversation || isMutatingConversation) {
      return;
    }

    const confirmed = window.confirm("Clear this conversation history for both members? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      setIsMutatingConversation(true);
      const response = await fetch(`/api/conversations/${paramValue}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Could not clear conversation history");
      }

      await queryClient.invalidateQueries({ queryKey: [`chat:${paramValue}`] });
      await queryClient.invalidateQueries({ queryKey: ["chat-header-pinned", paramValue] });
      router.refresh();
    } catch (error) {
      console.log(error);
    } finally {
      setIsMutatingConversation(false);
    }
  };

  const deleteChat = async () => {
    if (!canMutateConversation || isMutatingConversation) {
      return;
    }

    const confirmed = window.confirm("Delete this conversation for both members? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      setIsMutatingConversation(true);
      const response = await fetch(`/api/conversations/${paramValue}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete conversation");
      }

      router.push(`/servers/${serverId}`);
      router.refresh();
    } catch (error) {
      console.log(error);
    } finally {
      setIsMutatingConversation(false);
    }
  };

  const toggleSharing = async () => {
    if (isMutatingSharing) {
      return;
    }

    const nextValue = !localSharingDisabled;

    try {
      setIsMutatingSharing(true);
      setLocalSharingDisabled(nextValue);

      const response = await fetch(qs.stringifyUrl({
        url: "/api/chat-sharing",
        query: {
          type: paramKey === "channelId" ? "channel" : "conversation",
          id: paramValue,
        },
      }), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sharingDisabled: nextValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not update sharing setting");
      }

      router.refresh();
    } catch (error) {
      console.log(error);
      setLocalSharingDisabled(!nextValue);
    } finally {
      setIsMutatingSharing(false);
    }
  };

  return (
    <>
      <Popover open={pinOpen} onOpenChange={setPinOpen}>
        <PopoverTrigger asChild>
          <button
            title="Pinned messages"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Pin className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-semibold">Pinned messages</p>
            {!!pinnedQuery.data?.items?.length && (
              <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {pinnedQuery.data.items.length}
              </span>
            )}
          </div>
          <MessageResults
            items={pinnedQuery.data?.items}
            emptyText={pinnedQuery.isLoading ? "Loading pinned messages..." : "No pinned messages yet."}
            onSelect={jumpToMessage}
          />
        </PopoverContent>
      </Popover>

      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <button
            title="Search messages"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Search className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              className="h-9 pl-8"
            />
          </div>
          <MessageResults
            items={sortedSearchItems}
            emptyText={
              search.trim().length < 2
                ? "Type at least 2 characters."
                : searchQuery.isLoading
                  ? "Searching messages..."
                  : "No matching messages."
            }
            searchTerm={search}
            onSelect={jumpToMessage}
          />
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="More"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isMutatingSharing}
            onClick={toggleSharing}
          >
            <Share2 className="mr-2 h-4 w-4" />
            {localSharingDisabled ? "Allow sharing" : "No sharing"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canMutateConversation || isMutatingConversation}
            onClick={clearHistory}
            className="text-zinc-500"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Clear history
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMutateConversation || isMutatingConversation}
            onClick={deleteChat}
            className="text-rose-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
