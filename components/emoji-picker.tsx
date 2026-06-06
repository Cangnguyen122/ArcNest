"use client";

import { Smile } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

export const EmojiPicker = ({
  onChange,
}: EmojiPickerProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-300/70 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="top"
        align="end"
        sideOffset={10}
        className="w-auto border-none bg-transparent p-0 shadow-xl"
      >
        <Picker
          theme={resolvedTheme}
          data={data}
          previewPosition="none"
          navPosition="top"
          onEmojiSelect={(emoji: any) => onChange(emoji.native)}
        />
      </PopoverContent>
    </Popover>
  )
}
