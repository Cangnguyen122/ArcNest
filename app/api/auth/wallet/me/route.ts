import { NextResponse } from "next/server";

import { getCurrentWalletSession, getSessionTokenFromAppRouter } from "@/lib/auth/wallet-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentWalletSession(getSessionTokenFromAppRouter());

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({
    profile: session.profile,
    wallet: {
      address: session.walletAddressLower,
      chainId: session.chainId,
    }
  });
}
