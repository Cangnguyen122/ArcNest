import { ChannelType } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [servers, conversations] = await Promise.all([
      db.server.findMany({
        where: {
          members: {
            some: {
              profileId: profile.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          channels: {
            where: {
              type: ChannelType.TEXT,
            },
            select: {
              id: true,
              name: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      db.conversation.findMany({
        where: {
          OR: [
            {
              memberOne: {
                profileId: profile.id,
              },
            },
            {
              memberTwo: {
                profileId: profile.id,
              },
            },
          ],
          messageRequestStatus: {
            not: "IGNORED",
          },
        },
        select: {
          id: true,
          memberOne: {
            select: {
              id: true,
              profileId: true,
              profile: {
                select: {
                  name: true,
                },
              },
            },
          },
          memberTwo: {
            select: {
              id: true,
              profileId: true,
              profile: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const channelTargets = servers.flatMap((server) => (
      server.channels.map((channel) => ({
        id: `channel:${channel.id}`,
        type: "channel" as const,
        label: `#${channel.name}`,
        description: server.name,
        apiUrl: "/api/socket/messages",
        query: {
          serverId: server.id,
          channelId: channel.id,
        },
      }))
    ));

    const conversationTargets = conversations.map((conversation) => {
      const otherMember = conversation.memberOne.profileId === profile.id
        ? conversation.memberTwo
        : conversation.memberOne;

      return {
        id: `conversation:${conversation.id}`,
        type: "conversation" as const,
        label: otherMember.profile.name,
        description: "Direct message",
        apiUrl: "/api/socket/direct-messages",
        query: {
          conversationId: conversation.id,
        },
      };
    });

    return NextResponse.json({
      items: [
        ...conversationTargets,
        ...channelTargets,
      ],
    });
  } catch (error) {
    console.log("[FORWARD_TARGETS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
