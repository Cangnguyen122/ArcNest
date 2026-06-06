import { NextResponse } from "next/server";

import { syncContractAccessPassForProfile } from "@/lib/access-pass";
import { currentProfile } from "@/lib/current-profile";
import { DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

export async function POST() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!DOGECORD_ACCESS_PASS.contractAddress) {
      return new NextResponse("Access pass contract is not configured", { status: 400 });
    }

    const walletAddress = profile.primaryWalletAddress || profile.primaryWalletAddressLower;

    if (!walletAddress) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    const pass = await syncContractAccessPassForProfile(profile);

    if (!pass) {
      return new NextResponse("No access pass found for this wallet", { status: 404 });
    }

    return NextResponse.json(pass);
  } catch (error) {
    console.log("[ACCESS_PASS_SYNC_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
