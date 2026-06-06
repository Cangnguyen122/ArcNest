"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
};

export const MediaRoom = ({
  chatId,
  video,
  audio
}: MediaRoomProps) => {
  const { address } = useAccount();
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!address) return;

    (async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${chatId}&username=${encodeURIComponent(address)}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.log(e);
      }
    })()
  }, [address, chatId]);

  if (token === "") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Loader2
          className="h-7 w-7 text-zinc-500 animate-spin my-4"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading...
        </p>
      </div>
    )
  }

  return (
    <LiveKitRoom
      className="min-h-0 flex-1"
      data-lk-theme="default"
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      video={video}
      audio={audio}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}
