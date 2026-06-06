import { NextResponse } from "next/server";

import { getActiveAccessPassForProfile, syncContractAccessPassForProfile } from "@/lib/access-pass";
import { currentProfile } from "@/lib/current-profile";
import { DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await currentProfile();

  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const pass = DOGECORD_ACCESS_PASS.contractAddress
    ? await syncContractAccessPassForProfile(profile)
    : await getActiveAccessPassForProfile(profile.id);

  return NextResponse.json({
    hasPass: !!pass,
    pass,
    contract: {
      address: DOGECORD_ACCESS_PASS.contractAddress,
      priceUsdc: DOGECORD_ACCESS_PASS.priceUsdc,
      chainId: DOGECORD_ACCESS_PASS.chainId,
    },
  });
}
