"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, CornerUpLeft, Plus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";
import { GifPicker } from "@/components/gif-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChatAttachmentUpload } from "./chat-attachment-upload";
import { useUploadThing } from "@/lib/uploadthing";

interface ChatInputProps {
  chatId: string;
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
}

const formSchema = z.object({
  content: z.string().max(20000),
});

const getUploadedUrl = (file: any) => {
  return (
    file?.url ||
    file?.ufsUrl ||
    file?.appUrl ||
    file?.fileUrl ||
    file?.serverData?.url ||
    ""
  );
};

const isImageFile = (file: File) => {
  return file.type.startsWith("image/");
};

const isVideoFile = (file: File) => {
  return file.type.startsWith("video/");
};

const getAttachmentLimitMb = (file: File) => {
  if (isImageFile(file)) {
    return 8;
  }

  if (isVideoFile(file)) {
    return 64;
  }

  return 16;
};

export const ChatInput = ({
  chatId,
  apiUrl,
  query,
  name,
  type,
}: ChatInputProps) => {
  const { onOpen } = useModal();
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; memberName: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState("");
  const { startUpload, isUploading } = useUploadThing("messageFile");

  useEffect(() => {
    const handleReply = (event: Event) => {
      const replyEvent = event as CustomEvent<{ id: string; content: string; memberName: string }>;
      setReplyTo(replyEvent.detail);
    };

    window.addEventListener(`chat:${chatId}:reply`, handleReply);

    return () => window.removeEventListener(`chat:${chatId}:reply`, handleReply);
  }, [chatId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    }
  });

  const isLoading = form.formState.isSubmitting;
  const isSubmitting = isLoading || isUploading;

  const handleAttachmentSelect = (file: File) => {
    const limitMb = getAttachmentLimitMb(file);
    const sizeMb = file.size / 1024 / 1024;

    if (sizeMb > limitMb) {
      window.alert(`File is too large. Maximum size is ${limitMb} MB.`);
      return;
    }

    setPendingAttachment(file);
  };

  useEffect(() => {
    if (!pendingAttachment || (!isImageFile(pendingAttachment) && !isVideoFile(pendingAttachment))) {
      setPendingAttachmentPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(pendingAttachment);
    setPendingAttachmentPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [pendingAttachment]);

  const sendGif = async (url: string) => {
    try {
      const endpoint = qs.stringifyUrl({
        url: apiUrl,
        query,
      });

      await axios.post(endpoint, {
        content: "GIF",
        fileUrl: url,
        replyToMessageId: replyTo?.id,
      });

      setReplyTo(null);
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: apiUrl,
        query,
      });

      let fileUrl = "";

      if (pendingAttachment) {
        const response = await startUpload([pendingAttachment]);
        fileUrl = getUploadedUrl(response?.[0]);

        if (!fileUrl) {
          return;
        }
      }

      const content = values.content.trim() || fileUrl;

      await axios.post(url, {
        content,
        fileUrl: fileUrl || undefined,
        replyToMessageId: replyTo?.id,
      });

      form.reset();
      setReplyTo(null);
      setPendingAttachment(null);
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Form {...form}>
      <form className="shrink-0" onSubmit={form.handleSubmit(onSubmit)}>
        {replyTo && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-zinc-100/80 px-3 py-2 text-xs text-zinc-600 shadow-sm dark:bg-zinc-800/80 dark:text-zinc-300">
            <span className="h-8 w-[3px] shrink-0 rounded-full bg-indigo-400" />
            <CornerUpLeft className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-4 text-indigo-500 dark:text-indigo-300">
                Replying to {replyTo.memberName}
              </div>
              <div className="truncate text-zinc-500 dark:text-zinc-400">
                {replyTo.content}
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              onClick={() => setReplyTo(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {pendingAttachment && (
          <div className="mx-4 mt-3 flex items-center gap-3 rounded-md bg-zinc-100/80 px-3 py-2 text-xs text-zinc-600 shadow-sm dark:bg-zinc-800/80 dark:text-zinc-300">
            {pendingAttachmentPreview && isImageFile(pendingAttachment) && (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-700">
                <Image
                  src={pendingAttachmentPreview}
                  alt={pendingAttachment.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {pendingAttachmentPreview && isVideoFile(pendingAttachment) && (
              <video
                src={pendingAttachmentPreview}
                className="h-12 w-16 shrink-0 rounded-md bg-black object-cover"
                muted
              />
            )}
            {!pendingAttachmentPreview && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-[10px] font-bold uppercase text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                File
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-4 text-zinc-800 dark:text-zinc-100">
                {pendingAttachment.name}
              </div>
              <div className="text-zinc-500 dark:text-zinc-400">
                {(pendingAttachment.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              onClick={() => setPendingAttachment(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative p-4 pb-6">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="absolute left-8 top-7 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-500 p-1 transition hover:bg-zinc-600 dark:bg-zinc-400 dark:hover:bg-zinc-300"
                      >
                        <Plus className="text-white dark:text-[#313338]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={10}
                      className="w-56 p-1"
                    >
                      <ChatAttachmentUpload
                        disabled={isSubmitting}
                        onSelect={handleAttachmentSelect}
                      />
                      <button
                        type="button"
                        onClick={() => onOpen("messagePoll", { apiUrl, query })}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        Create poll
                      </button>
                    </PopoverContent>
                  </Popover>
                  <Input
                    disabled={isSubmitting}
                    className="pl-14 pr-36 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                    placeholder={`Message ${type === "conversation" ? name : "#" + name}`}
                    {...field}
                  />
                  <div className="absolute right-16 top-6 flex items-center gap-1.5">
                    <GifPicker onSelect={sendGif} />
                    <EmojiPicker
                      onChange={(emoji: string) => field.onChange(`${field.value} ${emoji}`)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!field.value.trim() && !pendingAttachment)}
                    className="absolute right-8 top-7 flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-indigo-300"
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
