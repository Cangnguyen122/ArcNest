ALTER TABLE "Profile" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "Profile_lastSeenAt_idx" ON "Profile"("lastSeenAt");
