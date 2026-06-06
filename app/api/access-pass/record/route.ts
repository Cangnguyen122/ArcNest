import { AccessPassTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, http, isHash } from "viem";

import { getActiveAccessPassForProfile } from "@/lib/access-pass";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { DOGECORD_ACCESS_PASS_ABI, ERC721_TRANSFER_EVENT_ABI, LEGACY_ACCESS_PASS_MINTED_EVENT_ABI } from "@/lib/web3/access-pass-abi";
import { ARC_TESTNET, DOGECORD_ACCESS_PASS, normalizeAddress } from "@/lib/web3/arc";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!DOGECORD_ACCESS_PASS.contractAddress) {
      return new NextResponse("Access pass contract is not configured", { status: 400 });
    }

    const { txHash } = await req.json();

    if (typeof txHash !== "string" || !isHash(txHash)) {
      return new NextResponse("Invalid transaction hash", { status: 400 });
    }

    const walletAddress = profile.primaryWalletAddress || profile.primaryWalletAddressLower;

    if (!walletAddress) {
      return new NextResponse("Wallet required", { status: 400 });
    }

    const existingPass = await getActiveAccessPassForProfile(profile.id);

    if (existingPass) {
      return NextResponse.json(existingPass);
    }

    const publicClient = createPublicClient({
      transport: http(ARC_TESTNET.rpcUrl),
    });
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== "success" || normalizeAddress(receipt.from) !== normalizeAddress(walletAddress)) {
      return new NextResponse("Mint transaction could not be verified", { status: 400 });
    }

    const decodeAccessPassMintLog = (log: (typeof receipt.logs)[number]) => {
      try {
        return decodeEventLog({
          abi: DOGECORD_ACCESS_PASS_ABI,
          data: log.data,
          topics: log.topics,
        });
      } catch {
        try {
          return decodeEventLog({
            abi: LEGACY_ACCESS_PASS_MINTED_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      }
    };

    const mintLog = receipt.logs
      .filter((log) => normalizeAddress(log.address) === normalizeAddress(DOGECORD_ACCESS_PASS.contractAddress))
      .map(decodeAccessPassMintLog)
      .find((event) => (
        event?.eventName === "AccessPassMinted" &&
        normalizeAddress(String(event.args.buyer)) === normalizeAddress(walletAddress)
      ));

    const transferLog = mintLog
      ? null
      : receipt.logs
        .filter((log) => normalizeAddress(log.address) === normalizeAddress(DOGECORD_ACCESS_PASS.contractAddress))
        .map((log) => {
          try {
            return decodeEventLog({
              abi: ERC721_TRANSFER_EVENT_ABI,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((event) => (
          event?.eventName === "Transfer" &&
          normalizeAddress(String(event.args.from)) === "0x0000000000000000000000000000000000000000" &&
          normalizeAddress(String(event.args.to)) === normalizeAddress(walletAddress)
        ));

    if ((!mintLog || mintLog.eventName !== "AccessPassMinted") && (!transferLog || transferLog.eventName !== "Transfer")) {
      return new NextResponse("Access pass mint event not found", { status: 400 });
    }

    const tokenId = mintLog?.eventName === "AccessPassMinted"
      ? mintLog.args.tokenId
      : transferLog?.eventName === "Transfer"
        ? transferLog.args.tokenId
        : null;

    if (!tokenId) {
      return new NextResponse("Access pass token id not found", { status: 400 });
    }

    const pass = await db.accessPass.create({
      data: {
        walletAddress,
        walletAddressLower: normalizeAddress(walletAddress),
        chainId: DOGECORD_ACCESS_PASS.chainId,
        contractAddress: DOGECORD_ACCESS_PASS.contractAddress,
        contractAddressLower: normalizeAddress(DOGECORD_ACCESS_PASS.contractAddress),
        tokenId: tokenId.toString(),
        txHash,
        tier: AccessPassTier.LIFETIME,
        profileId: profile.id,
        mintedAt: new Date(),
      },
    });

    return NextResponse.json(pass);
  } catch (error) {
    console.log("[ACCESS_PASS_RECORD_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
