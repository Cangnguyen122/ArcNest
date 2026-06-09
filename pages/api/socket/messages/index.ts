import { NextApiRequest } from "next";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { publishSocketEvent } from "@/lib/socket-publish";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { hasActivePrivateRoomAccess, isPayMessage } from "@/lib/arcnest-pay";

const FORWARD_MESSAGE_PREFIX = "arcnest-forward:v1:";

const getForwardSource = (content: string) => {
  if (!content.startsWith(FORWARD_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(content.slice(FORWARD_MESSAGE_PREFIX.length));

    if (
      (payload?.sourceType !== "channel" && payload?.sourceType !== "conversation") ||
      typeof payload.sourceId !== "string"
    ) {
      return null;
    }

    return {
      type: payload.sourceType as "channel" | "conversation",
      id: payload.sourceId as string,
    };
  } catch {
    return null;
  }
};

const isForwardSourceLocked = async (content: string) => {
  const source = getForwardSource(content);

  if (!source) {
    return content.startsWith(FORWARD_MESSAGE_PREFIX);
  }

  if (source.type === "channel") {
    const channel = await db.channel.findUnique({
      where: {
        id: source.id,
      },
      select: {
        sharingDisabled: true,
      },
    });

    return !!channel?.sharingDisabled;
  }

  const conversation = await db.conversation.findUnique({
    where: {
      id: source.id,
    },
    select: {
      sharingDisabled: true,
    },
  });

  return !!conversation?.sharingDisabled;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl, replyToMessageId } = req.body;
    const { serverId, channelId } = req.query;
    
    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = rateLimit({
      key: rateLimitKey("messages-write", profile.id),
      max: 30,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      return res.status(429).json({ error: "Too Many Requests" });
    }
  
    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }
      
    if (!channelId) {
      return res.status(400).json({ error: "Channel ID missing" });
    }
          
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 20000) {
      return res.status(400).json({ error: "Invalid message content" });
    }

    if (isPayMessage(content)) {
      return res.status(400).json({ error: "Payment cards must be created through ArcNest Pay." });
    }

    if (await isForwardSourceLocked(content)) {
      return res.status(403).json({ error: "Sharing is disabled for the source chat." });
    }

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
        members: {
          some: {
            profileId: profile.id
          }
        }
      },
      include: {
        members: true,
      }
    });

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const hasRoomAccess = await hasActivePrivateRoomAccess(server.id, profile.id);

    if (!hasRoomAccess) {
      return res.status(403).json({ error: "Private room access expired." });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      }
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const member = server.members.find((member) => member.profileId === profile.id);

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const replyTo = typeof replyToMessageId === "string"
      ? await db.message.findFirst({
        where: {
          id: replyToMessageId,
          channelId: channelId as string,
          deleted: false,
        },
        include: {
          member: {
            include: {
              profile: true,
            },
          },
        },
      })
      : null;

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        replyToMessageId: replyTo?.id,
        replyToContent: replyTo?.content.slice(0, 180),
        replyToMemberName: replyTo?.member.profile.name,
        channelId: channelId as string,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          }
        }
      }
    });

    const channelKey = `chat:${channelId}:messages`;

    await publishSocketEvent({
      res,
      chatId: channelId as string,
      event: channelKey,
      payload: message,
    });

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}
