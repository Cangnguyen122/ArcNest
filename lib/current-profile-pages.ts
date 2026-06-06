import { NextApiRequest } from "next";

import { getCurrentWalletSession, getSessionTokenFromPagesRouter } from "@/lib/auth/wallet-session";

export const currentProfilePages = async (req: NextApiRequest) => {
  const session = await getCurrentWalletSession(getSessionTokenFromPagesRouter(req));

  if (!session) {
    return null;
  }

  return session.profile;
}
