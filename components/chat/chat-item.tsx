"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Member, MemberRole, Profile } from "@prisma/client";
import { Crown, Edit, FileIcon, Pin, Reply, ShieldCheck, Trash } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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

export const ChatItem = ({
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
  replyToContent,
  replyToMemberName,
  pinned = false,
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
  const canEditMessage = !deleted && isOwner && !fileUrl && !payPayload;
  const isPDF = fileType === "pdf" && fileUrl;
  const isGif = !!fileUrl && /\.gif(\?|$)/i.test(fileUrl);
  const isImage = !isPDF && !isGif && fileUrl;
  const roleIcon = roleIconMap[member.role];

  return (
    <div className="relative group flex items-center hover:bg-black/5 p-4 transition w-full">
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
          {isImage && (
            <a 
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48"
            >
              <Image
                src={fileUrl}
                alt={content}
                fill
                className="object-cover"
              />
            </a>
          )}
          {isGif && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block max-w-[320px] overflow-hidden rounded-md border bg-secondary"
            >
              <img
                src={fileUrl}
                alt={content}
                className="max-h-72 w-full object-cover"
              />
            </a>
          )}
          {isPDF && (
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
          {replyToContent && !deleted && (
            <div className="mt-2 max-w-xl rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/70">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-500">
                <Reply className="h-3 w-3" />
                {replyToMemberName || "Message"}
              </div>
              <div className="line-clamp-2 break-words text-zinc-500 dark:text-zinc-400">
                {replyToContent}
              </div>
            </div>
          )}
          {pinned && !deleted && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
              <Pin className="h-3 w-3" />
              Pinned
            </div>
          )}
          {payPayload && !isEditing && (
            <ArcNestPayCard
              payload={payPayload}
              currentProfileId={currentMember.profileId}
            />
          )}
          {!fileUrl && !payPayload && !isEditing && (
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
}
