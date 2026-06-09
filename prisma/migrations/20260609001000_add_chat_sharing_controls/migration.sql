ALTER TABLE "Channel" ADD COLUMN "sharingDisabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN "sharingDisabled" BOOLEAN NOT NULL DEFAULT false;
