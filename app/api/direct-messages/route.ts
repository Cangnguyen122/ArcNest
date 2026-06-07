import { NextResponse } from "next/server";
import { DirectMessage } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

const MESSAGES_BATCH = 10;

export const dynamic = "force-dynamic";

export async function GET(
  req: Request
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const conversationId = searchParams.get("conversationId");
    const pinned = searchParams.get("pinned") === "true";
    const search = searchParams.get("search")?.trim();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("direct-messages-read", profile.id),
      max: 120,
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
  
    if (!conversationId) {
      return new NextResponse("Conversation ID missing", { status: 400 });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
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
      return new NextResponse("Conversation not found", { status: 404 });
    }

    let messages: DirectMessage[] = [];

    if (pinned || search) {
      messages = await db.directMessage.findMany({
        take: 25,
        where: {
          conversationId,
          deleted: false,
          ...(pinned ? { pinned: true } : {}),
          ...(search
            ? {
                content: {
                  contains: search.slice(0, 100),
                  mode: "insensitive",
                },
              }
            : {}),
        },
        include: {
          member: {
            include: {
              profile: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        }
      });

      return NextResponse.json({
        items: messages,
        nextCursor: null
      });
    }

    if (cursor) {
      messages = await db.directMessage.findMany({
        take: MESSAGES_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          conversationId,
        },
        include: {
          member: {
            include: {
              profile: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        }
      })
    } else {
      messages = await db.directMessage.findMany({
        take: MESSAGES_BATCH,
        where: {
          conversationId,
        },
        include: {
          member: {
            include: {
              profile: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        }
      });
    }

    let nextCursor = null;

    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    return NextResponse.json({
      items: messages,
      nextCursor
    });
  } catch (error) {
    console.log("[DIRECT_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
