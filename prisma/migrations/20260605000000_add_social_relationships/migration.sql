CREATE TYPE "SocialRelationshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

CREATE TYPE "MessageRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED');

CREATE TABLE "SocialRelationship" (
    "id" TEXT NOT NULL,
    "requesterProfileId" TEXT NOT NULL,
    "addresseeProfileId" TEXT NOT NULL,
    "status" "SocialRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialRelationship_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Conversation"
ADD COLUMN "messageRequestStatus" "MessageRequestStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN "requestedByProfileId" TEXT;

CREATE UNIQUE INDEX "SocialRelationship_requesterProfileId_addresseeProfileId_key" ON "SocialRelationship"("requesterProfileId", "addresseeProfileId");
CREATE INDEX "SocialRelationship_addresseeProfileId_status_idx" ON "SocialRelationship"("addresseeProfileId", "status");
CREATE INDEX "SocialRelationship_requesterProfileId_status_idx" ON "SocialRelationship"("requesterProfileId", "status");
CREATE INDEX "Conversation_messageRequestStatus_idx" ON "Conversation"("messageRequestStatus");

ALTER TABLE "SocialRelationship" ADD CONSTRAINT "SocialRelationship_requesterProfileId_fkey" FOREIGN KEY ("requesterProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialRelationship" ADD CONSTRAINT "SocialRelationship_addresseeProfileId_fkey" FOREIGN KEY ("addresseeProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
