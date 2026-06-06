const ONLINE_WINDOW_MS = 90 * 1000;

export const isProfileOnline = (lastSeenAt?: Date | string | null) => {
  if (!lastSeenAt) {
    return false;
  }

  const lastSeenTime = typeof lastSeenAt === "string"
    ? new Date(lastSeenAt).getTime()
    : lastSeenAt.getTime();

  return Date.now() - lastSeenTime <= ONLINE_WINDOW_MS;
};
