"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";

interface ChatAttachmentUploadProps {
  disabled?: boolean;
  onSelect: (file: File) => void;
}

export const ChatAttachmentUpload = ({
  disabled = false,
  onSelect,
}: ChatAttachmentUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (!file || disabled) {
            return;
          }

          onSelect(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800"
      >
        <Paperclip className="h-4 w-4 text-zinc-500" />
        Upload file
      </button>
    </>
  );
};
