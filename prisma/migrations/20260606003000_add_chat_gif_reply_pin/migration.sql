ALTER TABLE "Message" ADD COLUMN "replyToMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "replyToContent" TEXT;
ALTER TABLE "Message" ADD COLUMN "replyToMemberName" TEXT;
ALTER TABLE "Message" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DirectMessage" ADD COLUMN "replyToMessageId" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "replyToContent" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "replyToMemberName" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Message_pinned_idx" ON "Message"("pinned");
CREATE INDEX "DirectMessage_pinned_idx" ON "DirectMessage"("pinned");
