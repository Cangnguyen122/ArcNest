import { NextResponse } from "next/server";

import { createSocketRoomToken, socketChatRoom } from "@/lib/socket-room-token";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { hasActivePrivateRoomAccess } from "@/lib/arcnest-pay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const type = searchParams.get("type");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("socket-token", profile.id),
      max: 30,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
        }
      });
    }

    if (!chatId || (type !== "channel" && type !== "conversation")) {
      return new NextResponse("Invalid socket room request", { status: 400 });
    }

    if (type === "channel") {
      const channel = await db.channel.findFirst({
        where: {
          id: chatId,
          server: {
            members: {
              some: {
                profileId: profile.id,
              }
            }
          }
        },
        select: {
          id: true,
          serverId: true,
        }
      });

      if (!channel) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const hasRoomAccess = await hasActivePrivateRoomAccess(channel.serverId, profile.id);

      if (!hasRoomAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      const conversation = await db.conversation.findFirst({
        where: {
          id: chatId,
          OR: [
            {
              memberOne: {
                profileId: profile.id,
              }
            },
            {
              memberTwo: {
                profileId: profile.id,
              }
            }
          ]
        },
        select: {
          id: true,
        }
      });

      if (!conversation) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    return NextResponse.json({
      room: socketChatRoom(chatId),
      token: createSocketRoomToken({
        chatId,
        profileId: profile.id,
      }),
    });
  } catch (error) {
    console.log("[SOCKET_TOKEN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
