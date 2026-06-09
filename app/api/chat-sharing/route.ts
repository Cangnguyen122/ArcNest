import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const { sharingDisabled } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if ((type !== "channel" && type !== "conversation") || !id || typeof sharingDisabled !== "boolean") {
      return new NextResponse("Invalid sharing settings request", { status: 400 });
    }

    if (type === "channel") {
      const channel = await db.channel.findFirst({
        where: {
          id,
          server: {
            members: {
              some: {
                profileId: profile.id,
                role: {
                  in: [MemberRole.ADMIN, MemberRole.MODERATOR],
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!channel) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const updatedChannel = await db.channel.update({
        where: {
          id,
        },
        data: {
          sharingDisabled,
        },
        select: {
          sharingDisabled: true,
        },
      });

      return NextResponse.json(updatedChannel);
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id,
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
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updatedConversation = await db.conversation.update({
      where: {
        id,
      },
      data: {
        sharingDisabled,
      },
      select: {
        sharingDisabled: true,
      },
    });

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.log("[CHAT_SHARING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
