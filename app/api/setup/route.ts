import { NextResponse } from "next/server";

import { getActiveAccessPassForProfile, syncContractAccessPassForProfile } from "@/lib/access-pass";
import { currentProfile } from "@/lib/current-profile";
import { ensureCoreServersForPassHolder } from "@/lib/server-provisioning";
import { DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

export async function POST() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const pass = DOGECORD_ACCESS_PASS.contractAddress
      ? await syncContractAccessPassForProfile(profile)
      : await getActiveAccessPassForProfile(profile.id);

    if (!pass) {
      return new NextResponse("Access pass required", { status: 403 });
    }

    const { arcHouse } = await ensureCoreServersForPassHolder(profile);

    return NextResponse.json({
      serverId: arcHouse.id,
    });
  } catch (error) {
    console.log("[SETUP_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
