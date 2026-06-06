import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

import { NextApiResponseServerIo } from "@/types";
import { socketChatRoom, verifySocketRoomToken } from "@/lib/socket-room-token";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: path,
      // @ts-ignore
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      socket.on("chat:join", ({ chatId, token }, callback) => {
        if (typeof chatId !== "string" || typeof token !== "string") {
          callback?.({ ok: false, error: "Invalid room request" });
          return;
        }

        const payload = verifySocketRoomToken(token, chatId);

        if (!payload) {
          callback?.({ ok: false, error: "Unauthorized room" });
          return;
        }

        socket.join(socketChatRoom(chatId));
        callback?.({ ok: true });
      });

      socket.on("chat:leave", ({ chatId }) => {
        if (typeof chatId !== "string") {
          return;
        }

        socket.leave(socketChatRoom(chatId));
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}

export default ioHandler;
