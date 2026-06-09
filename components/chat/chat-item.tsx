"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Member, MemberRole, Profile } from "@prisma/client";
import { BarChart3, CornerUpLeft, Crown, Edit, FileIcon, Forward, Pin, Reply, ShieldCheck, Trash } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { ArcNestPayCard } from "@/components/pay/arcnest-pay-card";

interface ChatItemProps {
  id: string;
  content: string;
  member: Member & {
    profile: Profile;
  };
  timestamp: string;
  fileUrl: string | null;
  deleted: boolean;
  currentMember: Member;
  isUpdated: boolean;
  socketUrl: string;
  socketQuery: Record<string, string>;
  replyToMessageId?: string | null;
  replyToContent?: string | null;
  replyToMemberName?: string | null;
  pinned?: boolean;
  isHighlighted?: boolean;
  sharingDisabled?: boolean;
  onReply?: () => void;
};

const roleIconMap = {
  "MEMBER": null,
  "GUEST": null,
  "MODERATOR": <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  "ADMIN": <Crown className="h-4 w-4 ml-2 text-amber-400" />,
}

const formSchema = z.object({
  content: z.string().min(1),
});

const PAY_MESSAGE_PREFIX = "arcnest-pay:v1:";
const POLL_MESSAGE_PREFIX = "arcnest-poll:v1:";
const FORWARD_MESSAGE_PREFIX = "arcnest-forward:v1:";

const decodePayMessage = (content: string) => {
  if (!content.startsWith(PAY_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(content.slice(PAY_MESSAGE_PREFIX.length));
  } catch {
    return null;
  }
};

const decodePollMessage = (content: string) => {
  if (!content.startsWith(POLL_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(content.slice(POLL_MESSAGE_PREFIX.length));

    if (
      payload?.kind !== "poll" ||
      typeof payload.question !== "string" ||
      !Array.isArray(payload.options)
    ) {
      return null;
    }

    return {
      question: payload.question,
      options: payload.options.filter((option: unknown) => typeof option === "string"),
    };
  } catch {
    return null;
  }
};

const decodeForwardMessage = (content: string) => {
  if (!content.startsWith(FORWARD_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(content.slice(FORWARD_MESSAGE_PREFIX.length));

    if (
      payload?.kind !== "forward" ||
      typeof payload.from !== "string" ||
      typeof payload.content !== "string"
    ) {
      return null;
    }

    return {
      from: payload.from,
      content: payload.content,
    };
  } catch {
    return null;
  }
};

const ChatAttachment = ({
  fileUrl,
  content,
  isPdf,
  isGif,
  isVideo,
  isImage,
  isFile,
}: {
  fileUrl: string;
  content: string;
  isPdf: boolean;
  isGif: boolean;
  isVideo: boolean;
  isImage: boolean;
  isFile: boolean;
}) => {
  const [unknownImageLoaded, setUnknownImageLoaded] = useState(false);
  const [unknownImageFailed, setUnknownImageFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const shouldProbeImage = isFile && !unknownImageLoaded && !unknownImageFailed;
  const shouldRenderImage = isImage || unknownImageLoaded;

  return (
    <>
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={() => setPreviewOpen(false)}
          >
            Close
          </button>
          {isVideo ? (
            <video
              src={fileUrl}
              controls
              autoPlay
              className="max-h-[86vh] max-w-[92vw] rounded-md bg-black"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div
              className="relative h-[86vh] w-[92vw]"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={fileUrl}
                alt={content || "Attachment preview"}
                fill
                sizes="92vw"
                className="object-contain"
                unoptimized={isGif}
              />
            </div>
          )}
        </div>
      )}
      {shouldProbeImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={fileUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="hidden"
          onLoad={() => setUnknownImageLoaded(true)}
          onError={() => setUnknownImageFailed(true)}
        />
      )}
      {shouldRenderImage && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="relative mt-2 block h-64 w-full max-w-[360px] overflow-hidden rounded-md border bg-secondary"
        >
          <Image
            src={fileUrl}
            alt={content || "Image attachment"}
            fill
            sizes="(max-width: 640px) 70vw, 360px"
            className="object-cover"
          />
        </button>
      )}
      {isGif && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="relative mt-2 block h-56 w-full max-w-[320px] overflow-hidden rounded-md border bg-secondary"
        >
          <Image
            src={fileUrl}
            alt={content || "GIF attachment"}
            fill
            sizes="(max-width: 640px) 70vw, 320px"
            className="object-cover"
            unoptimized
          />
        </button>
      )}
      {isPdf && (
        <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
          <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
          >
            PDF File
          </a>
        </div>
      )}
      {isVideo && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="mt-2 block max-w-[420px] overflow-hidden rounded-md border bg-black"
        >
          <video
            src={fileUrl}
            muted
            preload="metadata"
            className="max-h-80 w-full"
          />
        </button>
      )}
      {isFile && unknownImageFailed && (
        <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
          <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 max-w-[320px] truncate text-sm text-indigo-500 hover:underline dark:text-indigo-400"
          >
            Attached file
          </a>
        </div>
      )}
    </>
  );
};

export const ChatItem = memo(({
  id,
  content,
  member,
  timestamp,
  fileUrl,
  deleted,
  currentMember,
  isUpdated,
  socketUrl,
  socketQuery,
  replyToMessageId,
  replyToContent,
  replyToMemberName,
  pinned = false,
  isHighlighted = false,
  sharingDisabled = false,
  onReply,
}: ChatItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();

  const onMemberClick = () => {
    if (member.id === currentMember.id) {
      return;
    }
  
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  }

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        setIsEditing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: ""
    }
  });

  const isLoading = form.formState.isSubmitting;

  const startEditing = () => {
    form.reset({
      content,
    });
    setIsEditing(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery,
      });

      await axios.patch(url, values);

      form.reset();
      setIsEditing(false);
    } catch (error) {
      console.log(error);
    }
  }

  const togglePinned = async () => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery,
      });

      await axios.patch(url, { pinned: !pinned });
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (isEditing) {
      return;
    }

    form.reset({
      content,
    });
  }, [content, form, isEditing]);

  const fileType = fileUrl?.split(".").pop();

  const isAdmin = currentMember.role === MemberRole.ADMIN;
  const isModerator = currentMember.role === MemberRole.MODERATOR;
  const isOwner = currentMember.id === member.id;
  const canDeleteMessage = !deleted && (isAdmin || isModerator || isOwner);
  const payPayload = !fileUrl && !deleted ? decodePayMessage(content) : null;
  const pollPayload = !fileUrl && !deleted ? decodePollMessage(content) : null;
  const forwardPayload = !deleted ? decodeForwardMessage(content) : null;
  const canEditMessage = !deleted && isOwner && !fileUrl && !payPayload && !pollPayload;
  const isPDF = fileType === "pdf" && !!fileUrl;
  const isGif = !!fileUrl && /\.gif(\?|$)/i.test(fileUrl);
  const isVideo = !!fileUrl && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(fileUrl);
  const isImage = !isPDF && !isGif && !isVideo && !!fileUrl && /\.(png|jpe?g|webp|avif)(\?|$)/i.test(fileUrl);
  const isFile = !!fileUrl && !isPDF && !isGif && !isVideo && !isImage;
  const attachmentCaption = fileUrl && !forwardPayload && content && content !== fileUrl && content !== "GIF" ? content : "";
  const roleIcon = roleIconMap[member.role];

  return (
    <div
      id={`chat-message-${id}`}
      className={cn(
        "relative group flex items-center hover:bg-black/5 p-4 transition w-full",
        isHighlighted && "chat-message-highlight"
      )}
    >
      <div className="group flex gap-x-2 items-start w-full">
        <div onClick={onMemberClick} className="cursor-pointer hover:drop-shadow-md transition">
          <UserAvatar src={member.profile.imageUrl} />
        </div>
        <div className="flex flex-col w-full">
          <div className="flex items-center gap-x-2">
            <div className="flex items-center">
              <p onClick={onMemberClick} className="font-semibold text-sm hover:underline cursor-pointer">
                {member.profile.name}
              </p>
              {roleIcon && (
                <span title={member.role.toLowerCase()}>
                  {roleIcon}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {timestamp}
            </span>
          </div>
          {fileUrl && (
            <ChatAttachment
              fileUrl={fileUrl}
              content={content}
              isPdf={isPDF}
              isGif={isGif}
              isVideo={isVideo}
              isImage={isImage}
              isFile={isFile}
            />
          )}
          {attachmentCaption && !isEditing && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {attachmentCaption}
              {isUpdated && !deleted && (
                <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
                  (edited)
                </span>
              )}
            </p>
          )}
          {replyToContent && !deleted && (
            <button
              type="button"
              onClick={() => {
                if (!replyToMessageId) {
                  return;
                }

                const chatId = socketQuery.channelId || socketQuery.conversationId;

                if (typeof chatId !== "string") {
                  return;
                }

                window.dispatchEvent(new CustomEvent(`chat:${chatId}:jump-message`, {
                  detail: {
                    messageId: replyToMessageId,
                  },
                }));
              }}
              className="mb-1.5 mt-1.5 flex max-w-2xl items-stretch text-left transition hover:translate-x-0.5"
            >
              <span className="w-[3px] shrink-0 rounded-full bg-indigo-400/80" />
              <div className="min-w-0 rounded-r-md bg-zinc-100/70 px-2.5 py-1.5 dark:bg-zinc-800/70">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold leading-none text-indigo-500 dark:text-indigo-300">
                  <CornerUpLeft className="h-3 w-3" />
                  {replyToMemberName || "Message"}
                </div>
                <div className="mt-1 line-clamp-1 break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {replyToContent}
                </div>
              </div>
            </button>
          )}
          {pinned && !deleted && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
              <Pin className="h-3 w-3" />
              Pinned
            </div>
          )}
          {forwardPayload && !isEditing && (
            <div className="mt-2 max-w-2xl rounded-md border-l-4 border-indigo-400 bg-zinc-100/70 px-3 py-2 dark:bg-zinc-800/70">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase text-indigo-500 dark:text-indigo-300">
                <Forward className="h-3.5 w-3.5" />
                Forwarded from {forwardPayload.from}
              </div>
              {forwardPayload.content && forwardPayload.content !== fileUrl && (
                <p className="break-words text-sm text-zinc-600 dark:text-zinc-300">
                  {forwardPayload.content}
                </p>
              )}
            </div>
          )}
          {payPayload && !isEditing && (
            <ArcNestPayCard
              payload={payPayload}
              currentProfileId={currentMember.profileId}
            />
          )}
          {pollPayload && !isEditing && (
            <div className="mt-2 max-w-md rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    Poll
                  </p>
                  <p className="break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {pollPayload.question}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {pollPayload.options.map((option: string, index: number) => (
                  <div
                    key={`${option}-${index}`}
                    className="rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200"
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!fileUrl && !payPayload && !pollPayload && !forwardPayload && !isEditing && (
            <p className={cn(
              "text-sm text-zinc-600 dark:text-zinc-300",
              deleted && "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
            )}>
              {content}
              {isUpdated && !deleted && (
                <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
                  (edited)
                </span>
              )}
            </p>
          )}
          {!fileUrl && isEditing && (
            <Form {...form}>
              <form 
                className="flex items-center w-full gap-x-2 pt-2"
                onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative w-full">
                            <Input
                              disabled={isLoading}
                              className="p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                              placeholder="Edited message"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button disabled={isLoading} size="sm" variant="primary">
                    Save
                  </Button>
              </form>
              <span className="text-[10px] mt-1 text-zinc-400">
                Press escape to cancel, enter to save
              </span>
            </Form>
          )}
        </div>
      </div>
      {!deleted && (
        <div className="hidden group-hover:flex items-center gap-x-2 absolute p-1 -top-2 right-5 bg-white dark:bg-zinc-800 border rounded-sm">
          {!sharingDisabled && (
            <ActionTooltip label="Forward">
              <Forward
                onClick={() => onOpen("messageForward", {
                  forwardMessage: {
                    id,
                    content,
                    fileUrl,
                    authorName: member.profile.name,
                    sourceType: socketQuery.channelId ? "channel" : "conversation",
                    sourceId: socketQuery.channelId || socketQuery.conversationId,
                  },
                })}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {onReply && (
            <ActionTooltip label="Reply">
              <Reply
                onClick={onReply}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {canDeleteMessage && (
            <ActionTooltip label={pinned ? "Unpin" : "Pin"}>
              <Pin
                onClick={togglePinned}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {canEditMessage && (
            <ActionTooltip label="Edit">
              <Edit
                onClick={startEditing}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {canDeleteMessage && (
            <ActionTooltip label="Delete">
              <Trash
                onClick={() => onOpen("deleteMessage", { 
                  apiUrl: `${socketUrl}/${id}`,
                  query: socketQuery,
                 })}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
        </div>
      )}
    </div>
  )
});

ChatItem.displayName = "ChatItem";
