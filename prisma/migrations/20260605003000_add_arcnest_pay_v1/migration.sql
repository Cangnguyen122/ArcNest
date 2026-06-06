-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'P2P_TRANSFER';
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'PRIVATE_ROOM_ACCESS';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "receiverWalletAddress" TEXT;
ALTER TABLE "Payment" ADD COLUMN "receiverWalletAddressLower" TEXT;
ALTER TABLE "Payment" ADD COLUMN "amountUnits" TEXT;
ALTER TABLE "Payment" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "privateRoomInviteId" TEXT;

-- CreateEnum
CREATE TYPE "PrivateRoomInviteStatus" AS ENUM ('ACTIVE', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "PrivateRoomInvite" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "serverId" TEXT,
    "priceUsdc" TEXT NOT NULL,
    "priceUsdcUnits" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PrivateRoomInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "creatorProfileId" TEXT NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PrivateRoomInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateRoomAccess" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateRoomAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_receiverWalletAddressLower_idx" ON "Payment"("receiverWalletAddressLower");
CREATE INDEX "Payment_conversationId_idx" ON "Payment"("conversationId");
CREATE INDEX "Payment_privateRoomInviteId_idx" ON "Payment"("privateRoomInviteId");
CREATE INDEX "PrivateRoomInvite_conversationId_idx" ON "PrivateRoomInvite"("conversationId");
CREATE INDEX "PrivateRoomInvite_creatorProfileId_idx" ON "PrivateRoomInvite"("creatorProfileId");
CREATE INDEX "PrivateRoomInvite_recipientProfileId_idx" ON "PrivateRoomInvite"("recipientProfileId");
CREATE INDEX "PrivateRoomInvite_serverId_idx" ON "PrivateRoomInvite"("serverId");
CREATE INDEX "PrivateRoomInvite_status_idx" ON "PrivateRoomInvite"("status");
CREATE UNIQUE INDEX "PrivateRoomAccess_serverId_profileId_key" ON "PrivateRoomAccess"("serverId", "profileId");
CREATE UNIQUE INDEX "Member_profileId_serverId_key" ON "Member"("profileId", "serverId");
CREATE INDEX "PrivateRoomAccess_profileId_idx" ON "PrivateRoomAccess"("profileId");
CREATE INDEX "PrivateRoomAccess_inviteId_idx" ON "PrivateRoomAccess"("inviteId");
CREATE INDEX "PrivateRoomAccess_expiresAt_idx" ON "PrivateRoomAccess"("expiresAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_privateRoomInviteId_fkey" FOREIGN KEY ("privateRoomInviteId") REFERENCES "PrivateRoomInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivateRoomInvite" ADD CONSTRAINT "PrivateRoomInvite_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateRoomInvite" ADD CONSTRAINT "PrivateRoomInvite_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateRoomAccess" ADD CONSTRAINT "PrivateRoomAccess_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateRoomAccess" ADD CONSTRAINT "PrivateRoomAccess_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "PrivateRoomInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
