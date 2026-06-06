import { MemberRole } from "@prisma/client";
import { createPublicClient, http, isHash } from "viem";

import { db } from "@/lib/db";
import { ARC_TESTNET, ARCNEST_PAY, normalizeAddress } from "@/lib/web3/arc";

export const ARCNEST_PAY_MESSAGE_PREFIX = "arcnest-pay:v1:";

export const parseUsdcAmount = (amount: unknown) => {
  if (typeof amount !== "string") {
    return null;
  }

  const trimmed = amount.trim();

  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    return null;
  }

  if (Number(trimmed) <= 0) {
    return null;
  }

  return trimmed;
};

export const isPayMessage = (content: string) => {
  return content.startsWith(ARCNEST_PAY_MESSAGE_PREFIX);
};

export const encodePayMessage = (payload: Record<string, unknown>) => {
  return `${ARCNEST_PAY_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
};

export const decodePayMessage = (content: string) => {
  if (!isPayMessage(content)) {
    return null;
  }

  try {
    return JSON.parse(content.slice(ARCNEST_PAY_MESSAGE_PREFIX.length));
  } catch {
    return null;
  }
};

export const getConversationForProfile = async (conversationId: string, profileId: string) => {
  return db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        {
          memberOne: {
            profileId,
          },
        },
        {
          memberTwo: {
            profileId,
          },
        },
      ],
    },
    include: {
      memberOne: {
        include: {
          profile: true,
        },
      },
      memberTwo: {
        include: {
          profile: true,
        },
      },
    },
  });
};

export const hasActivePrivateRoomAccess = async (serverId: string, profileId: string) => {
  const member = await db.member.findFirst({
    where: {
      serverId,
      profileId,
    },
    select: {
      role: true,
      server: {
        select: {
          profileId: true,
        },
      },
    },
  });

  if (!member) {
    return false;
  }

  if (
    member.server.profileId === profileId ||
    member.role === MemberRole.ADMIN ||
    member.role === MemberRole.MODERATOR
  ) {
    return true;
  }

  const roomAccess = await db.privateRoomAccess.findFirst({
    where: {
      serverId,
      profileId,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  const hasPaidAccessRecord = await db.privateRoomInvite.findFirst({
    where: {
      serverId,
    },
    select: {
      id: true,
    },
  });

  return !hasPaidAccessRecord || !!roomAccess;
};

export const verifyUsdcTransfer = async ({
  txHash,
  fromAddress,
  toAddress,
  amountUnits,
}: {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountUnits: string;
}) => {
  if (!isHash(txHash)) {
    throw new Error("Invalid transaction hash");
  }

  const expectedAmount = BigInt(amountUnits);

  if (expectedAmount <= BigInt(0)) {
    throw new Error("Invalid amount");
  }

  const publicClient = createPublicClient({
    transport: http(ARC_TESTNET.rpcUrl),
  });
  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });
  const transaction = await publicClient.getTransaction({
    hash: txHash as `0x${string}`,
  });

  if (receipt.status !== "success" || normalizeAddress(receipt.from) !== normalizeAddress(fromAddress)) {
    throw new Error("Transfer transaction could not be verified");
  }

  if (
    !transaction.to ||
    normalizeAddress(transaction.to) !== normalizeAddress(toAddress) ||
    transaction.value < expectedAmount
  ) {
    throw new Error("Native USDC transfer not found");
  }

  return receipt;
};
