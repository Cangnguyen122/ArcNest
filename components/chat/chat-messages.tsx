"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Member, Message, Profile } from "@prisma/client";
import { ArrowDown, Loader2, ServerCrash } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatSocket } from "@/hooks/use-chat-socket";

import { ChatWelcome } from "./chat-welcome";
import { ChatItem } from "./chat-item";

const DATE_FORMAT = "d MMM yyyy, HH:mm";

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile
  }
  replyToMessageId?: string | null;
  replyToContent?: string | null;
  replyToMemberName?: string | null;
  pinned?: boolean;
}

interface ChatMessagesProps {
  name: string;
  member: Member;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation";
  sharingDisabled?: boolean;
}

export const ChatMessages = ({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type,
  sharingDisabled = false,
}: ChatMessagesProps) => {
  const queryKey = `chat:${chatId}`;
  const addKey = `chat:${chatId}:messages`;
  const updateKey = `chat:${chatId}:messages:update`;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const { isRoomLive } = useChatSocket({ chatId, type, queryKey, addKey, updateKey });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useChatQuery({
    queryKey,
    apiUrl,
    paramKey,
    paramValue,
    realTimeEnabled: isRoomLive,
  });

  const messages = useMemo(() => {
    return (data?.pages || [])
      .slice()
      .reverse()
      .flatMap((group) => (group.items || []).slice().reverse()) as MessageWithMemberWithProfile[];
  }, [data]);

  const firstItemIndex = Math.max(0, 100000 - messages.length);
  const latestMessage = messages[messages.length - 1];

  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    if (messages.length === 0) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index: "LAST",
      align: "end",
      behavior,
    });
    setNewMessageCount(0);
  }, [messages.length]);

  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((message) => message.id === messageId);

    if (index === -1) {
      return false;
    }

    virtuosoRef.current?.scrollToIndex({
      index: firstItemIndex + index,
      align: "center",
      behavior: "smooth",
    });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((current) => current === messageId ? null : current);
    }, 2200);

    return true;
  }, [firstItemIndex, messages]);

  useEffect(() => {
    const handleJump = (event: Event) => {
      const messageId = (event as CustomEvent<{ messageId?: string }>).detail?.messageId;

      if (!messageId) {
        return;
      }

      if (!scrollToMessage(messageId)) {
        setPendingJumpId(messageId);
      }
    };

    window.addEventListener(`chat:${chatId}:jump-message`, handleJump);

    return () => {
      window.removeEventListener(`chat:${chatId}:jump-message`, handleJump);
    };
  }, [chatId, scrollToMessage]);

  useEffect(() => {
    if (!pendingJumpId || isFetchingNextPage) {
      return;
    }

    if (scrollToMessage(pendingJumpId)) {
      setPendingJumpId(null);
      return;
    }

    if (hasNextPage) {
      fetchNextPage();
      return;
    }

    setPendingJumpId(null);
  }, [data, fetchNextPage, hasNextPage, isFetchingNextPage, pendingJumpId, scrollToMessage]);

  useEffect(() => {
    if (!latestMessage) {
      latestMessageIdRef.current = null;
      return;
    }

    if (!latestMessageIdRef.current) {
      latestMessageIdRef.current = latestMessage.id;
      scrollToBottom("auto");
      return;
    }

    if (latestMessageIdRef.current === latestMessage.id) {
      return;
    }

    latestMessageIdRef.current = latestMessage.id;

    if (latestMessage.memberId === member.id || isAtBottom) {
      scrollToBottom("smooth");
      return;
    }

    setNewMessageCount((count) => count + 1);
  }, [isAtBottom, latestMessage, member.id, scrollToBottom]);

  if (status === "loading") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 flex-1">
      <Virtuoso
        ref={virtuosoRef}
        className="h-full"
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={messages.length > 0 ? { index: "LAST", align: "end" } : 0}
        followOutput={(isAtBottom) => isAtBottom ? "smooth" : false}
        atBottomStateChange={(atBottom) => {
          setIsAtBottom(atBottom);

          if (atBottom) {
            setNewMessageCount(0);
          }
        }}
        startReached={() => {
          if (!isFetchingNextPage && hasNextPage) {
            fetchNextPage();
          }
        }}
        components={{
          Header: () => (
            <div className="py-4">
              {!hasNextPage && (
                <ChatWelcome
                  type={type}
                  name={name}
                />
              )}
              {hasNextPage && (
                <div className="flex justify-center">
                  {isFetchingNextPage ? (
                    <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
                  ) : (
                    <button
                      onClick={() => fetchNextPage()}
                      className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
                    >
                      Load previous messages
                    </button>
                  )}
                </div>
              )}
            </div>
          ),
        }}
        itemContent={(_, message) => (
          <ChatItem
            id={message.id}
            currentMember={member}
            member={message.member}
            content={message.content}
            fileUrl={message.fileUrl}
            deleted={message.deleted}
            timestamp={format(new Date(message.createdAt), DATE_FORMAT)}
            isUpdated={message.updatedAt !== message.createdAt}
            socketUrl={socketUrl}
            socketQuery={socketQuery}
            replyToMessageId={message.replyToMessageId}
            replyToContent={message.replyToContent}
            replyToMemberName={message.replyToMemberName}
            pinned={!!message.pinned}
            isHighlighted={highlightedMessageId === message.id}
            sharingDisabled={sharingDisabled}
            onReply={() => {
              const nextReply = {
                id: message.id,
                content: message.content,
                memberName: message.member.profile.name,
              };
              window.dispatchEvent(new CustomEvent(`chat:${chatId}:reply`, { detail: nextReply }));
            }}
          />
        )}
      />
      {!isAtBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowDown className="h-4 w-4 text-indigo-500" />
          {newMessageCount > 0 ? `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""}` : "Jump to latest"}
        </button>
      )}
    </div>
  )
}
