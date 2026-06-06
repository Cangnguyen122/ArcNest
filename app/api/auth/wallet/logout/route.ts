import { NextResponse } from "next/server";

import {
  getCurrentWalletSession,
  getSessionTokenFromAppRouter,
  hashSessionToken,
  WALLET_SESSION_COOKIE,
} from "@/lib/auth/wallet-session";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const sessionToken = getSessionTokenFromAppRouter();
    const session = await getCurrentWalletSession(sessionToken);

    if (sessionToken && session) {
      await db.walletSession.update({
        where: {
          sessionTokenHash: hashSessionToken(sessionToken),
        },
        data: {
          revokedAt: new Date(),
        }
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(WALLET_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.log("[WALLET_LOGOUT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
