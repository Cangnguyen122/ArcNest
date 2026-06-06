import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export const initialProfile = async () => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const latestProfile = await db.profile.findUnique({
    where: {
      id: profile.id
    }
  });

  return latestProfile || profile;
};
