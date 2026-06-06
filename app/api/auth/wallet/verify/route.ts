import { NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";

import {
  createSessionToken,
  hashSessionToken,
  walletSessionCookieOptions,
  WALLET_SESSION_COOKIE,
  walletSessionExpiresAt,
} from "@/lib/auth/wallet-session";
import { buildWalletLoginMessage, shortWalletAddress } from "@/lib/auth/wallet-message";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { ARC_TESTNET, isArcTestnetChain, normalizeAddress } from "@/lib/web3/arc";

export async function POST(req: Request) {
  try {
    const { address, chainId, nonce, signature } = await req.json();

    if (typeof address !== "string" || !isAddress(address)) {
      return new NextResponse("Invalid wallet address", { status: 400 });
    }

    if (typeof chainId !== "number" || typeof nonce !== "string" || typeof signature !== "string") {
      return new NextResponse("Invalid verification payload", { status: 400 });
    }

    if (!isArcTestnetChain(chainId)) {
      return new NextResponse(`Please switch to ${ARC_TESTNET.name}`, { status: 400 });
    }

    const addressLower = normalizeAddress(address);
    const limit = rateLimit({
      key: rateLimitKey("wallet-verify", addressLower, req.headers.get("x-forwarded-for") || "local"),
      max: 10,
      windowMs: 60 * 1000,
    });

    if (limit.limited) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
        }
      });
    }

    const challenge = await db.walletAuthChallenge.findFirst({
      where: {
        addressLower,
        chainId,
        nonce,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        }
      }
    });

    if (!challenge) {
      return new NextResponse("Challenge expired or not found", { status: 401 });
    }

    const message = buildWalletLoginMessage({
      domain: challenge.domain,
      address,
      chainId,
      nonce: challenge.nonce,
      statement: challenge.statement,
      issuedAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
    });

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const existingWallet = await db.wallet.findUnique({
      where: {
        addressLower,
      },
      include: {
        profile: true,
      }
    });

    const profile = existingWallet?.profile || await db.profile.create({
      data: {
        userId: `wallet:${addressLower}`,
        primaryWalletAddress: address,
        primaryWalletAddressLower: addressLower,
        name: shortWalletAddress(address),
        imageUrl: "",
        wallets: {
          create: {
            address,
            addressLower,
            chainId,
            isPrimary: true,
            verifiedAt: new Date(),
          }
        }
      }
    });

    if (existingWallet && !existingWallet.verifiedAt) {
      await db.wallet.update({
        where: {
          addressLower,
        },
        data: {
          verifiedAt: new Date(),
          chainId,
        }
      });
    }

    await db.walletAuthChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        consumedAt: new Date(),
      }
    });

    const sessionToken = createSessionToken();
    const expiresAt = walletSessionExpiresAt();

    await db.walletSession.create({
      data: {
        sessionTokenHash: hashSessionToken(sessionToken),
        walletAddressLower: addressLower,
        chainId,
        profileId: profile.id,
        expiresAt,
      }
    });

    const response = NextResponse.json({
      profile,
      wallet: {
        address,
        chainId,
      }
    });

    response.cookies.set(WALLET_SESSION_COOKIE, sessionToken, walletSessionCookieOptions(expiresAt));

    return response;
  } catch (error) {
    console.log("[WALLET_VERIFY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
