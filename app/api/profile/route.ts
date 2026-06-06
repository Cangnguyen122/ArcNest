import { NextResponse } from "next/server";
import * as z from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(32),
  imageUrl: z.string().trim().max(2048).optional(),
  bio: z.string().trim().max(240).optional(),
});

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const values = profileSchema.parse(await req.json());

    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id,
      },
      data: {
        name: values.name,
        imageUrl: values.imageUrl || "",
        bio: values.bio || "",
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.log("[PROFILE_PATCH]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid profile data", { status: 400 });
    }

    return new NextResponse("Internal Error", { status: 500 });
  }
}
