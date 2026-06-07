import { NextApiResponseServerIo } from "@/types";
import { socketChatRoom } from "@/lib/socket-room-token";

export const publishSocketEvent = async ({
  res,
  chatId,
  event,
  payload,
}: {
  res?: NextApiResponseServerIo;
  chatId: string;
  event: string;
  payload: unknown;
}) => {
  res?.socket?.server?.io?.to(socketChatRoom(chatId)).emit(event, payload);

  const socketServerUrl = process.env.SOCKET_SERVER_URL;

  if (!socketServerUrl) {
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.SOCKET_SERVER_SECRET) {
    console.warn("[SOCKET_PUBLISH] SOCKET_SERVER_SECRET is missing");
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${socketServerUrl.replace(/\/$/, "")}/publish`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        ...(process.env.SOCKET_SERVER_SECRET
          ? { "Authorization": `Bearer ${process.env.SOCKET_SERVER_SECRET}` }
          : {}),
      },
        body: JSON.stringify({
          chatId,
          event,
          payload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[SOCKET_PUBLISH] publish failed with ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn("[SOCKET_PUBLISH]", error);
  }
};
