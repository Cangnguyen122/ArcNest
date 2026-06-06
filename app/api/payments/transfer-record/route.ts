import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { encodePayMessage, getConversationForProfile, parseUsdcAmount, verifyUsdcTransfer } from "@/lib/arcnest-pay";
import { ARC_TESTNET, ARCNEST_PAY, arcExplorerTxUrl, normalizeAddress } from "@/lib/web3/arc";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId, recipientProfileId, amount, amountUnits, txHash, note } = await req.json();
    const parsedAmount = parseUsdcAmount(amount);
    const paymentNote = typeof note === "string" ? note.trim().slice(0, 280) : "";

    if (
      typeof conversationId !== "string" ||
      typeof recipientProfileId !== "string" ||
      typeof amountUnits !== "string" ||
      typeof txHash !== "string" ||
      !parsedAmount
    ) {
      return new NextResponse("Invalid payment data", { status: 400 });
    }

    const conversation = await getConversationForProfile(conversationId, profile.id);

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    const senderMember = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;
    const recipientMember = conversation.memberOne.profileId === recipientProfileId ? conversation.memberOne : conversation.memberTwo;

    if (!senderMember || !recipientMember || recipientMember.profileId === profile.id) {
      return new NextResponse("Invalid recipient", { status: 400 });
    }

    const senderWallet = profile.primaryWalletAddress || profile.primaryWalletAddressLower;
    const recipientWallet = recipientMember.profile.primaryWalletAddress || recipientMember.profile.primaryWalletAddressLower;

    if (!senderWallet || !recipientWallet) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    await verifyUsdcTransfer({
      txHash,
      fromAddress: senderWallet,
      toAddress: recipientWallet,
      amountUnits,
    });

    const payment = await db.payment.create({
      data: {
        walletAddress: senderWallet,
        walletAddressLower: normalizeAddress(senderWallet),
        receiverWalletAddress: recipientWallet,
        receiverWalletAddressLower: normalizeAddress(recipientWallet),
        chainId: ARCNEST_PAY.chainId,
        tokenAddress: null,
        tokenAddressLower: null,
        amount: parsedAmount,
        amountUnits,
        txHash,
        status: "CONFIRMED",
        purpose: "P2P_TRANSFER",
        conversationId,
        profileId: profile.id,
        confirmedAt: new Date(),
      },
    });

    const message = await db.directMessage.create({
      data: {
        conversationId,
        memberId: senderMember.id,
        content: encodePayMessage({
          kind: "p2p_transfer",
          paymentId: payment.id,
          amount: parsedAmount,
          currency: "USDC",
          tokenType: "native",
          note: paymentNote || null,
          status: payment.status,
          txHash,
          explorerUrl: arcExplorerTxUrl(txHash),
          network: ARC_TESTNET.name,
          senderProfileId: profile.id,
          recipientProfileId: recipientMember.profileId,
          recipientName: recipientMember.profile.name,
          recipientWallet,
        }),
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    return NextResponse.json({ payment, message });
  } catch (error) {
    console.log("[ARCNEST_PAY_TRANSFER_RECORD_POST]", error);
    return new NextResponse("Payment could not be verified", { status: 400 });
  }
}
