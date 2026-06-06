import { ChannelType, MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { encodePayMessage, getConversationForProfile, parseUsdcAmount } from "@/lib/arcnest-pay";
import { ARC_TESTNET } from "@/lib/web3/arc";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId, priceUsdc, priceUsdcUnits, durationHours, description } = await req.json();
    const parsedPrice = parseUsdcAmount(priceUsdc);

    if (
      typeof conversationId !== "string" ||
      typeof priceUsdcUnits !== "string" ||
      typeof durationHours !== "number" ||
      typeof description !== "string" ||
      !parsedPrice ||
      durationHours < 1 ||
      durationHours > 24 * 365 ||
      description.trim().length < 1 ||
      description.trim().length > 500
    ) {
      return new NextResponse("Invalid invite data", { status: 400 });
    }

    const conversation = await getConversationForProfile(conversationId, profile.id);

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    const creatorMember = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;
    const recipientMember = conversation.memberOne.profileId === profile.id ? conversation.memberTwo : conversation.memberOne;
    const creatorWallet = profile.primaryWalletAddress || profile.primaryWalletAddressLower;

    if (!creatorMember || !recipientMember || !creatorWallet) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    const roomName = `${profile.name}'s private room`;

    const result = await db.$transaction(async (tx) => {
      const server = await tx.server.create({
        data: {
          profileId: profile.id,
          name: roomName,
          imageUrl: profile.imageUrl,
          inviteCode: uuidv4(),
          channels: {
            create: [
              {
                name: "general",
                type: ChannelType.TEXT,
                profileId: profile.id,
              },
            ],
          },
          members: {
            create: [
              {
                profileId: profile.id,
                role: MemberRole.ADMIN,
              },
            ],
          },
        },
      });

      const invite = await tx.privateRoomInvite.create({
        data: {
          conversationId,
          serverId: server.id,
          priceUsdc: parsedPrice,
          priceUsdcUnits,
          durationHours,
          description: description.trim(),
          creatorProfileId: profile.id,
          recipientProfileId: recipientMember.profileId,
        },
      });

      const message = await tx.directMessage.create({
        data: {
          conversationId,
          memberId: creatorMember.id,
          content: encodePayMessage({
            kind: "private_room_invite",
            inviteId: invite.id,
            serverId: server.id,
            priceUsdc: parsedPrice,
            priceUsdcUnits,
            durationHours,
            description: invite.description,
            status: invite.status,
            network: ARC_TESTNET.name,
            creatorProfileId: profile.id,
            creatorName: profile.name,
            creatorWallet,
            recipientProfileId: recipientMember.profileId,
          }),
        },
      });

      return { invite, server, message };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[PRIVATE_ROOM_INVITES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
