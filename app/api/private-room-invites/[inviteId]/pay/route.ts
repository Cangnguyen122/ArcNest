import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { verifyUsdcTransfer } from "@/lib/arcnest-pay";
import { ARCNEST_PAY, normalizeAddress } from "@/lib/web3/arc";

export async function POST(
  req: Request,
  { params }: { params: { inviteId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { txHash } = await req.json();

    if (typeof txHash !== "string") {
      return new NextResponse("Invalid transaction hash", { status: 400 });
    }

    const invite = await db.privateRoomInvite.findFirst({
      where: {
        id: params.inviteId,
        recipientProfileId: profile.id,
      },
      include: {
        creatorProfile: true,
      },
    });

    if (!invite || !invite.serverId) {
      return new NextResponse("Invite not found", { status: 404 });
    }

    if (invite.status !== "ACTIVE") {
      return new NextResponse("Invite is not payable", { status: 400 });
    }

    const payerWallet = profile.primaryWalletAddress || profile.primaryWalletAddressLower;
    const receiverWallet = invite.creatorProfile.primaryWalletAddress || invite.creatorProfile.primaryWalletAddressLower;

    if (!payerWallet || !receiverWallet) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    await verifyUsdcTransfer({
      txHash,
      fromAddress: payerWallet,
      toAddress: receiverWallet,
      amountUnits: invite.priceUsdcUnits,
    });

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + invite.durationHours * 60 * 60 * 1000);

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          walletAddress: payerWallet,
          walletAddressLower: normalizeAddress(payerWallet),
          receiverWalletAddress: receiverWallet,
          receiverWalletAddressLower: normalizeAddress(receiverWallet),
          chainId: ARCNEST_PAY.chainId,
          tokenAddress: null,
          tokenAddressLower: null,
          amount: invite.priceUsdc,
          amountUnits: invite.priceUsdcUnits,
          txHash,
          status: "CONFIRMED",
          purpose: "PRIVATE_ROOM_ACCESS",
          conversationId: invite.conversationId,
          privateRoomInviteId: invite.id,
          profileId: profile.id,
          confirmedAt: startsAt,
        },
      });

      const member = await tx.member.upsert({
        where: {
          profileId_serverId: {
            profileId: profile.id,
            serverId: invite.serverId!,
          },
        },
        create: {
          profileId: profile.id,
          serverId: invite.serverId!,
          role: MemberRole.MEMBER,
        },
        update: {},
      });

      const access = await tx.privateRoomAccess.upsert({
        where: {
          serverId_profileId: {
            serverId: invite.serverId!,
            profileId: profile.id,
          },
        },
        create: {
          serverId: invite.serverId!,
          profileId: profile.id,
          inviteId: invite.id,
          startsAt,
          expiresAt,
        },
        update: {
          inviteId: invite.id,
          startsAt,
          expiresAt,
        },
      });

      const updatedInvite = await tx.privateRoomInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "PAID",
          paidAt: startsAt,
        },
      });

      return { payment, member, access, invite: updatedInvite };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[PRIVATE_ROOM_INVITES_PAY_POST]", error);
    return new NextResponse("Payment could not be verified", { status: 400 });
  }
}
