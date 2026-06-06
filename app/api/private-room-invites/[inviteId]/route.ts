import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { inviteId: string } }
) {
  const profile = await currentProfile();

  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const invite = await db.privateRoomInvite.findFirst({
    where: {
      id: params.inviteId,
      OR: [
        {
          creatorProfileId: profile.id,
        },
        {
          recipientProfileId: profile.id,
        },
      ],
    },
    include: {
      accesses: {
        where: {
          profileId: profile.id,
        },
        orderBy: {
          expiresAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!invite) {
    return new NextResponse("Invite not found", { status: 404 });
  }

  return NextResponse.json({
    id: invite.id,
    status: invite.status,
    serverId: invite.serverId,
    paidAt: invite.paidAt,
    access: invite.accesses[0] || null,
  });
}
