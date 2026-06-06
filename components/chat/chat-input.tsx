"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

interface ChatInputProps {
  chatId: string;
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
}

const formSchema = z.object({
  content: z.string().min(1),
});

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

      await axios.post(url, {
        ...values,
        replyToMessageId: replyTo?.id,
      });

      form.reset();
      setReplyTo(null);
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Form {...form}>
      <form className="shrink-0" onSubmit={form.handleSubmit(onSubmit)}>
        {replyTo && (
          <div className="mx-4 mt-2 flex items-center justify-between rounded-t-md border border-b-0 border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <div className="min-w-0">
              <span className="font-semibold text-indigo-500">Replying to {replyTo.memberName}</span>
              <span className="ml-2 truncate text-zinc-500 dark:text-zinc-400">
                {replyTo.content}
              </span>
            </div>
            <button
              type="button"
              className="ml-3 inline-flex shrink-0 items-center font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              onClick={() => setReplyTo(null)}
            >
              <X className="h-3.5 w-3.5" />
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
                  <button
                    type="button"
                    onClick={() => onOpen("messageFile", { apiUrl, query })}
                    className="absolute left-8 top-7 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-500 p-1 transition hover:bg-zinc-600 dark:bg-zinc-400 dark:hover:bg-zinc-300"
                  >
                    <Plus className="text-white dark:text-[#313338]" />
                  </button>
                  <Input
                    disabled={isLoading}
                    className="pl-14 pr-32 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                    placeholder={`Message ${type === "conversation" ? name : "#" + name}`}
                    {...field}
                  />
                  <div className="absolute right-16 top-6 flex items-center gap-1">
                    <GifPicker onSelect={sendGif} />
                    <EmojiPicker
                      onChange={(emoji: string) => field.onChange(`${field.value} ${emoji}`)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !field.value.trim()}
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
