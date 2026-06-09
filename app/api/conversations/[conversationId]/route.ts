import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

interface ConversationRouteProps {
  params: {
    conversationId: string;
  };
}

const getConversationForCurrentProfile = async (conversationId: string, profileId: string) => {
  return db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        {
          memberOne: {
            profileId,
          },
        },
        {
          memberTwo: {
            profileId,
          },
        },
      ],
    },
    select: {
      id: true,
      memberOne: {
        select: {
          profileId: true,
        },
      },
      memberTwo: {
        select: {
          profileId: true,
        },
      },
    },
  });
};

const getFileKind = (fileUrl: string) => {
  const path = fileUrl.split("?")[0]?.toLowerCase() || "";

  if (/\.gif$/i.test(path)) {
    return "gifs";
  }

  if (/\.(png|jpe?g|webp|avif)$/i.test(path)) {
    return "photos";
  }

  if (/\.(mp4|mov|webm|m4v)$/i.test(path)) {
    return "videos";
  }

  if (/\.(pdf|txt|csv|docx?|xlsx?|pptx?|zip)$/i.test(path)) {
    return "files";
  }

  return "unknown";
};

const shouldIncludeSharedFile = (fileUrl: string, type: string) => {
  const kind = getFileKind(fileUrl);

  if (kind === type) {
    return true;
  }

  if (kind === "unknown" && type === "photos") {
    return true;
  }

  return false;
};

const getSharedFileKind = (fileUrl: string) => {
  const kind = getFileKind(fileUrl);

  if (kind !== "unknown") {
    return kind;
  }

  return "files";
};

export async function GET(
  req: Request,
  { params }: ConversationRouteProps,
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("conversation-shared", profile.id),
      max: 60,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
        },
      });
    }

    const conversation = await getConversationForCurrentProfile(params.conversationId, profile.id);

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    if (type === "mutual-groups") {
      const otherProfileId = conversation.memberOne.profileId === profile.id
        ? conversation.memberTwo.profileId
        : conversation.memberOne.profileId;

      const servers = await db.server.findMany({
        take: 20,
        where: {
          AND: [
            {
              members: {
                some: {
                  profileId: profile.id,
                },
              },
            },
            {
              members: {
                some: {
                  profileId: otherProfileId,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return NextResponse.json({ items: servers });
    }

    if (type === "links") {
      const messages = await db.directMessage.findMany({
        take: 25,
        where: {
          conversationId: conversation.id,
          deleted: false,
          fileUrl: null,
          content: {
            contains: "http",
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          member: {
            select: {
              profile: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ items: messages });
    }

    if (!type || !["videos", "photos", "files", "gifs"].includes(type)) {
      return new NextResponse("Invalid shared type", { status: 400 });
    }

    const messages = await db.directMessage.findMany({
      take: 75,
      where: {
        conversationId: conversation.id,
        deleted: false,
        fileUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        createdAt: true,
        member: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      items: messages
        .filter((message) => message.fileUrl && shouldIncludeSharedFile(message.fileUrl, type))
        .map((message) => ({
          ...message,
          fileKind: message.fileUrl ? getSharedFileKind(message.fileUrl) : "files",
        }))
        .slice(0, 25),
    });
  } catch (error) {
    console.log("[CONVERSATION_SHARED]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: ConversationRouteProps,
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("conversation-clear", profile.id),
      max: 10,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
        },
      });
    }

    const conversation = await getConversationForCurrentProfile(params.conversationId, profile.id);

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    await db.directMessage.deleteMany({
      where: {
        conversationId: conversation.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[CONVERSATION_CLEAR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: ConversationRouteProps,
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("conversation-delete", profile.id),
      max: 5,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
        },
      });
    }

    const conversation = await getConversationForCurrentProfile(params.conversationId, profile.id);

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    await db.conversation.delete({
      where: {
        id: conversation.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[CONVERSATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
