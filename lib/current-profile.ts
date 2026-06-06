import { getCurrentWalletSession, getSessionTokenFromAppRouter } from "@/lib/auth/wallet-session";

export const currentProfile = async () => {
  const session = await getCurrentWalletSession(getSessionTokenFromAppRouter());

  if (!session) {
    return null;
  }

  return session.profile;
}
