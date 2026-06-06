import { SocialRelationshipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { findSocialRelationshipBetweenProfiles } from "@/lib/social";

type SocialAction = "request" | "accept" | "reject" | "block" | "unblock";

const isSocialAction = (value: unknown): value is SocialAction => {
  return ["request", "accept", "reject", "block", "unblock"].includes(String(value));
};

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = rateLimit({
      key: rateLimitKey("social-relationship-write", profile.id),
      max: 20,
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

    const { targetProfileId, action } = await req.json();

    if (typeof targetProfileId !== "string" || !isSocialAction(action)) {
      return new NextResponse("Invalid relationship request", { status: 400 });
    }

    if (targetProfileId === profile.id) {
      return new NextResponse("Cannot target yourself", { status: 400 });
    }

    const targetProfile = await db.profile.findUnique({
      where: {
        id: targetProfileId,
      },
      select: {
        id: true,
      },
    });

    if (!targetProfile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    const existing = await findSocialRelationshipBetweenProfiles(profile.id, targetProfileId);

    if (action === "block") {
      if (existing) {
        const relationship = await db.socialRelationship.update({
          where: {
            id: existing.id,
          },
          data: {
            requesterProfileId: profile.id,
            addresseeProfileId: targetProfileId,
            status: SocialRelationshipStatus.BLOCKED,
          },
        });

        return NextResponse.json(relationship);
      }

      const relationship = await db.socialRelationship.create({
        data: {
          requesterProfileId: profile.id,
          addresseeProfileId: targetProfileId,
          status: SocialRelationshipStatus.BLOCKED,
        },
      });

      return NextResponse.json(relationship);
    }

    if (action === "unblock") {
      if (!existing || existing.status !== SocialRelationshipStatus.BLOCKED) {
        return new NextResponse("Block relationship not found", { status: 404 });
      }

      await db.socialRelationship.delete({
        where: {
          id: existing.id,
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (existing?.status === SocialRelationshipStatus.BLOCKED) {
      return new NextResponse("Relationship is blocked", { status: 403 });
    }

    if (action === "request") {
      if (existing) {
        return NextResponse.json(existing);
      }

      const relationship = await db.socialRelationship.create({
        data: {
          requesterProfileId: profile.id,
          addresseeProfileId: targetProfileId,
          status: SocialRelationshipStatus.PENDING,
        },
      });

      return NextResponse.json(relationship);
    }

    if (!existing || existing.status !== SocialRelationshipStatus.PENDING) {
      return new NextResponse("Pending relationship not found", { status: 404 });
    }

    if (existing.addresseeProfileId !== profile.id) {
      return new NextResponse("Only the recipient can answer this request", { status: 403 });
    }

    if (action === "accept") {
      const relationship = await db.socialRelationship.update({
        where: {
          id: existing.id,
        },
        data: {
          status: SocialRelationshipStatus.ACCEPTED,
        },
      });

      await db.conversation.updateMany({
        where: {
          messageRequestStatus: "PENDING",
          OR: [
            {
              memberOne: {
                profileId: profile.id,
              },
              memberTwo: {
                profileId: targetProfileId,
              },
            },
            {
              memberOne: {
                profileId: targetProfileId,
              },
              memberTwo: {
                profileId: profile.id,
              },
            },
          ],
        },
        data: {
          messageRequestStatus: "ACCEPTED",
        },
      });

      return NextResponse.json(relationship);
    }

    await db.socialRelationship.delete({
      where: {
        id: existing.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[SOCIAL_RELATIONSHIPS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
