import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextApiRequest } from "next";

import { db } from "@/lib/db";

export const WALLET_SESSION_COOKIE = "dogecord_session";
const SESSION_DAYS = 30;

export const hashSessionToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const createSessionToken = () => {
  return randomBytes(32).toString("hex");
};

export const walletSessionExpiresAt = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  return expiresAt;
};

export const walletSessionCookieOptions = (expiresAt: Date) => {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
};

export const getCurrentWalletSession = async (sessionToken?: string) => {
  if (!sessionToken) {
    return null;
  }

  return db.walletSession.findFirst({
    where: {
      sessionTokenHash: hashSessionToken(sessionToken),
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      }
    },
    include: {
      profile: true,
    }
  });
};

export const getSessionTokenFromAppRouter = () => {
  return cookies().get(WALLET_SESSION_COOKIE)?.value;
};

export const getSessionTokenFromPagesRouter = (req: NextApiRequest) => {
  return req.cookies[WALLET_SESSION_COOKIE];
};
