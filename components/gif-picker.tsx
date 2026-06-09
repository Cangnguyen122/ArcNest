"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GifPickerProps {
  onSelect: (url: string) => void;
}

interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "dc6zaTOxFJmzC";

export const GifPicker = ({
  onSelect,
}: GifPickerProps) => {
  const [query, setQuery] = useState("reaction");
  const [results, setResults] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadGifs = async () => {
      setIsLoading(true);

      try {
        const endpoint = query.trim()
          ? "https://api.giphy.com/v1/gifs/search"
          : "https://api.giphy.com/v1/gifs/trending";
        const params = new URLSearchParams({
          api_key: GIPHY_KEY,
          limit: "18",
          rating: "pg-13",
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        const gifs = Array.isArray(data.data) ? data.data : [];

        setResults(gifs.map((gif: any) => ({
          id: gif.id,
          title: gif.title || "GIF",
          previewUrl: gif.images?.fixed_width_small?.url || gif.images?.downsized?.url,
          url: gif.images?.original?.url || gif.images?.downsized?.url,
        })).filter((gif: GifResult) => gif.previewUrl && gif.url));
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timeout = window.setTimeout(loadGifs, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 min-w-8 items-center justify-center rounded-md px-1.5 text-[10px] font-black tracking-wide text-zinc-500 transition hover:bg-zinc-300/70 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
          title="GIF"
        >
          GIF
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={10}
        className="w-[360px] rounded-md border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GIFs"
            className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        {isLoading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        )}
        {!isLoading && (
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                title={gif.title}
                onClick={() => onSelect(gif.url)}
                className="relative aspect-square overflow-hidden rounded-md bg-zinc-100 transition hover:opacity-80 dark:bg-zinc-800"
              >
                <Image
                  src={gif.previewUrl}
                  alt={gif.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
