import { NextApiRequest } from "next";
import { MemberRole } from "@prisma/client";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { socketChatRoom } from "@/lib/socket-room-token";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isPayMessage } from "@/lib/arcnest-pay";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { directMessageId, conversationId } = req.query;
    const { content, pinned } = req.body;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = rateLimit({
      key: rateLimitKey("direct-messages-mutate", profile.id),
      max: 60,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      return res.status(429).json({ error: "Too Many Requests" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
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
      include: {
        memberOne: {
          include: {
            profile: true,
          }
        },
        memberTwo: {
          include: {
            profile: true,
          }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    let directMessage = await db.directMessage.findFirst({
      where: {
        id: directMessageId as string,
        conversationId: conversationId as string,
      },
      include: {
        member: {
          include: {
            profile: true,
          }
        }
      }
    })

    if (!directMessage || directMessage.deleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isMessageOwner = directMessage.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "DELETE") {
      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string,
        },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
        },
        include: {
          member: {
            include: {
              profile: true,
            }
          }
        }
      })
    }

    if (req.method === "PATCH") {
      if (typeof pinned === "boolean") {
        directMessage = await db.directMessage.update({
          where: {
            id: directMessageId as string,
          },
          data: {
            pinned,
          },
          include: {
            member: {
              include: {
                profile: true,
              }
            }
          }
        });
      } else {
      if (!isMessageOwner) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (typeof content !== "string" || content.trim().length === 0 || content.length > 20000) {
        return res.status(400).json({ error: "Invalid message content" });
      }

      if (isPayMessage(content) || isPayMessage(directMessage.content)) {
        return res.status(400).json({ error: "Payment cards cannot be edited." });
      }

      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string,
        },
        data: {
          content,
        },
        include: {
          member: {
            include: {
              profile: true,
            }
          }
        }
      })
      }
    }

    const updateKey = `chat:${conversation.id}:messages:update`;

    res?.socket?.server?.io?.to(socketChatRoom(conversation.id)).emit(updateKey, directMessage);

    return res.status(200).json(directMessage);
  } catch (error) {
    console.log("[MESSAGE_ID]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
