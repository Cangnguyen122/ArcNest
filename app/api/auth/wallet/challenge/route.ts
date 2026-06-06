import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { buildWalletLoginMessage } from "@/lib/auth/wallet-message";
import { APP_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { ARC_TESTNET, isArcTestnetChain, normalizeAddress } from "@/lib/web3/arc";

const CHALLENGE_TTL_MINUTES = 10;
const STATEMENT = `Sign this message to authenticate with ${APP_NAME}. This does not make a blockchain transaction or cost gas.`;

export async function POST(req: Request) {
  try {
    const { address, chainId } = await req.json();

    if (typeof address !== "string" || !isAddress(address)) {
      return new NextResponse("Invalid wallet address", { status: 400 });
    }

    if (typeof chainId !== "number") {
      return new NextResponse("Invalid chain id", { status: 400 });
    }

    if (!isArcTestnetChain(chainId)) {
      return new NextResponse(`Please switch to ${ARC_TESTNET.name}`, { status: 400 });
    }

    const addressLower = normalizeAddress(address);
    const limit = rateLimit({
      key: rateLimitKey("wallet-challenge", addressLower, req.headers.get("x-forwarded-for") || "local"),
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

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MINUTES * 60 * 1000);
    const nonce = randomBytes(16).toString("hex");
    const domain = req.headers.get("host") || "localhost";

    const challenge = await db.walletAuthChallenge.create({
      data: {
        addressLower,
        chainId,
        nonce,
        domain,
        statement: STATEMENT,
        expiresAt,
      }
    });

    return NextResponse.json({
      nonce,
      message: buildWalletLoginMessage({
        domain,
        address,
        chainId,
        nonce: challenge.nonce,
        statement: challenge.statement,
        issuedAt: challenge.createdAt,
        expiresAt: challenge.expiresAt,
      }),
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    console.log("[WALLET_CHALLENGE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
