import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.profile.update({
      where: {
        id: profile.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[PRESENCE_HEARTBEAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
