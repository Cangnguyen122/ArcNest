import { AccessPassTier } from "@prisma/client";
import { NextResponse } from "next/server";

import { getActiveAccessPassForProfile } from "@/lib/access-pass";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { DOGECORD_ACCESS_PASS, normalizeAddress } from "@/lib/web3/arc";

export async function POST() {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (DOGECORD_ACCESS_PASS.contractAddress && process.env.NODE_ENV === "production") {
      return new NextResponse("Contract purchase required", { status: 403 });
    }

    const walletAddress = profile.primaryWalletAddress || profile.primaryWalletAddressLower;

    if (!walletAddress) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    const existingPass = await getActiveAccessPassForProfile(profile.id);

    if (existingPass) {
      return NextResponse.json(existingPass);
    }

    const walletAddressLower = normalizeAddress(walletAddress);
    const contractAddress = DOGECORD_ACCESS_PASS.contractAddress || "dev-arcnest-access-pass";
    const now = new Date();

    const pass = await db.accessPass.create({
      data: {
        walletAddress,
        walletAddressLower,
        chainId: DOGECORD_ACCESS_PASS.chainId,
        contractAddress,
        contractAddressLower: normalizeAddress(contractAddress),
        tokenId: profile.id,
        txHash: `dev-pass:${profile.id}:${now.getTime()}`,
        tier: AccessPassTier.LIFETIME,
        profileId: profile.id,
        mintedAt: now,
      },
    });

    return NextResponse.json(pass);
  } catch (error) {
    console.log("[ACCESS_PASS_DEV_CLAIM_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
