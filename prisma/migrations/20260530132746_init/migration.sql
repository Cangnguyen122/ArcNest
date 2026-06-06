-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AccessPassStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccessPassTier" AS ENUM ('LIFETIME', 'FOUNDER', 'CREATOR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('ACCESS_PASS');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryWalletAddress" TEXT,
    "primaryWalletAddressLower" TEXT,
    "accessStatus" "AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressLower" TEXT NOT NULL,
    "chainId" INTEGER,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "profileId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAuthChallenge" (
    "id" TEXT NOT NULL,
    "addressLower" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletSession" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "walletAddressLower" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "profileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessPass" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAddressLower" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "contractAddressLower" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "status" "AccessPassStatus" NOT NULL DEFAULT 'ACTIVE',
    "tier" "AccessPassTier" NOT NULL DEFAULT 'LIFETIME',
    "profileId" TEXT NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAddressLower" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT,
    "tokenAddressLower" TEXT,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "txHash" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'ACCESS_PASS',
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "profileId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'TEXT',
    "profileId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "memberId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "memberOneId" TEXT NOT NULL,
    "memberTwoId" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "memberId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_primaryWalletAddressLower_idx" ON "Profile"("primaryWalletAddressLower");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_addressLower_key" ON "Wallet"("addressLower");

-- CreateIndex
CREATE INDEX "Wallet_profileId_idx" ON "Wallet"("profileId");

-- CreateIndex
CREATE INDEX "Wallet_chainId_idx" ON "Wallet"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAuthChallenge_nonce_key" ON "WalletAuthChallenge"("nonce");

-- CreateIndex
CREATE INDEX "WalletAuthChallenge_addressLower_idx" ON "WalletAuthChallenge"("addressLower");

-- CreateIndex
CREATE INDEX "WalletAuthChallenge_expiresAt_idx" ON "WalletAuthChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletSession_sessionTokenHash_key" ON "WalletSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "WalletSession_profileId_idx" ON "WalletSession"("profileId");

-- CreateIndex
CREATE INDEX "WalletSession_walletAddressLower_idx" ON "WalletSession"("walletAddressLower");

-- CreateIndex
CREATE INDEX "WalletSession_expiresAt_idx" ON "WalletSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessPass_txHash_key" ON "AccessPass"("txHash");

-- CreateIndex
CREATE INDEX "AccessPass_profileId_idx" ON "AccessPass"("profileId");

-- CreateIndex
CREATE INDEX "AccessPass_walletAddressLower_idx" ON "AccessPass"("walletAddressLower");

-- CreateIndex
CREATE INDEX "AccessPass_chainId_idx" ON "AccessPass"("chainId");

-- CreateIndex
CREATE INDEX "AccessPass_contractAddressLower_tokenId_idx" ON "AccessPass"("contractAddressLower", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_txHash_key" ON "Payment"("txHash");

-- CreateIndex
CREATE INDEX "Payment_profileId_idx" ON "Payment"("profileId");

-- CreateIndex
CREATE INDEX "Payment_walletAddressLower_idx" ON "Payment"("walletAddressLower");

-- CreateIndex
CREATE INDEX "Payment_chainId_idx" ON "Payment"("chainId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Server_inviteCode_key" ON "Server"("inviteCode");

-- CreateIndex
CREATE INDEX "Server_profileId_idx" ON "Server"("profileId");

-- CreateIndex
CREATE INDEX "Member_profileId_idx" ON "Member"("profileId");

-- CreateIndex
CREATE INDEX "Member_serverId_idx" ON "Member"("serverId");

-- CreateIndex
CREATE INDEX "Channel_profileId_idx" ON "Channel"("profileId");

-- CreateIndex
CREATE INDEX "Channel_serverId_idx" ON "Channel"("serverId");

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Message_memberId_idx" ON "Message"("memberId");

-- CreateIndex
CREATE INDEX "Conversation_memberTwoId_idx" ON "Conversation"("memberTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_memberOneId_memberTwoId_key" ON "Conversation"("memberOneId", "memberTwoId");

-- CreateIndex
CREATE INDEX "DirectMessage_memberId_idx" ON "DirectMessage"("memberId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_idx" ON "DirectMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletSession" ADD CONSTRAINT "WalletSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPass" ADD CONSTRAINT "AccessPass_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_memberOneId_fkey" FOREIGN KEY ("memberOneId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_memberTwoId_fkey" FOREIGN KEY ("memberTwoId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
