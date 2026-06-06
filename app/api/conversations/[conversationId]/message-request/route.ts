import { MessageRequestStatus, SocialRelationshipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { findSocialRelationshipBetweenProfiles } from "@/lib/social";

interface MessageRequestRouteProps {
  params: {
    conversationId: string;
  };
}

export async function PATCH(req: Request, { params }: MessageRequestRouteProps) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action } = await req.json();

    if (action !== "accept" && action !== "ignore") {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: params.conversationId,
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
      include: {
        memberOne: true,
        memberTwo: true,
      },
    });

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    if (conversation.messageRequestStatus !== MessageRequestStatus.PENDING) {
      return new NextResponse("Message request is not pending", { status: 400 });
    }

    if (conversation.requestedByProfileId === profile.id) {
      return new NextResponse("Requester cannot answer this request", { status: 403 });
    }

    const otherProfileId = conversation.memberOne.profileId === profile.id
      ? conversation.memberTwo.profileId
      : conversation.memberOne.profileId;

    const updatedConversation = await db.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        messageRequestStatus: action === "accept"
          ? MessageRequestStatus.ACCEPTED
          : MessageRequestStatus.IGNORED,
      },
    });

    if (action === "accept") {
      const existing = await findSocialRelationshipBetweenProfiles(profile.id, otherProfileId);

      if (existing) {
        if (existing.status !== SocialRelationshipStatus.BLOCKED) {
          await db.socialRelationship.update({
            where: {
              id: existing.id,
            },
            data: {
              status: SocialRelationshipStatus.ACCEPTED,
            },
          });
        }
      } else {
        await db.socialRelationship.create({
          data: {
            requesterProfileId: otherProfileId,
            addresseeProfileId: profile.id,
            status: SocialRelationshipStatus.ACCEPTED,
          },
        });
      }
    }

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.log("[MESSAGE_REQUEST_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
