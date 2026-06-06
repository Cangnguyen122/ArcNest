import { AccessPassStatus, AccessPassTier } from "@prisma/client";
import { createPublicClient, http } from "viem";

import { db } from "@/lib/db";
import { DOGECORD_ACCESS_PASS_ABI, ERC721_TRANSFER_EVENT_ABI } from "@/lib/web3/access-pass-abi";
import { ARC_TESTNET, DOGECORD_ACCESS_PASS, normalizeAddress } from "@/lib/web3/arc";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LOG_SCAN_BLOCK_RANGE = BigInt(9999);

export const hasActiveAccessPass = async (walletAddress: string) => {
  const contractAddress = DOGECORD_ACCESS_PASS.contractAddress;

  if (!contractAddress) {
    return false;
  }

  const pass = await db.accessPass.findFirst({
    where: {
      walletAddressLower: normalizeAddress(walletAddress),
      chainId: DOGECORD_ACCESS_PASS.chainId,
      contractAddressLower: normalizeAddress(contractAddress),
      status: AccessPassStatus.ACTIVE,
    },
    select: {
      id: true,
    }
  });

  return !!pass;
};

export const getActiveAccessPassForProfile = async (profileId: string) => {
  return db.accessPass.findFirst({
    where: {
      profileId,
      chainId: DOGECORD_ACCESS_PASS.chainId,
      status: AccessPassStatus.ACTIVE,
    },
    orderBy: {
      mintedAt: "desc",
    },
  });
};

type ProfileForAccessPassSync = {
  id: string;
  primaryWalletAddress?: string | null;
  primaryWalletAddressLower?: string | null;
};

const findOwnedTokenIdFromTransferLogs = async ({
  publicClient,
  contractAddress,
  account,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  contractAddress: `0x${string}`;
  account: `0x${string}`;
}) => {
  const latestBlock = await publicClient.getBlockNumber();
  const deploymentBlock = BigInt(process.env.ACCESS_PASS_DEPLOY_BLOCK || "0");
  let toBlock = latestBlock;

  while (toBlock >= deploymentBlock) {
    const fromBlock = toBlock > LOG_SCAN_BLOCK_RANGE
      ? toBlock - LOG_SCAN_BLOCK_RANGE
      : BigInt(0);
    const boundedFromBlock = fromBlock > deploymentBlock ? fromBlock : deploymentBlock;
    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: ERC721_TRANSFER_EVENT_ABI[0],
      args: {
        from: ZERO_ADDRESS,
        to: account,
      },
      fromBlock: boundedFromBlock,
      toBlock,
    });

    for (const log of logs.reverse()) {
      const tokenId = log.args.tokenId;

      if (!tokenId) {
        continue;
      }

      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: DOGECORD_ACCESS_PASS_ABI,
        functionName: "ownerOf",
        args: [tokenId],
      }).catch(() => null);

      if (owner && normalizeAddress(owner) === normalizeAddress(account)) {
        return tokenId;
      }
    }

    if (boundedFromBlock === deploymentBlock || boundedFromBlock === BigInt(0)) {
      break;
    }

    toBlock = boundedFromBlock - BigInt(1);
  }

  return null;
};

export const syncContractAccessPassForProfile = async (profile: ProfileForAccessPassSync) => {
  if (!DOGECORD_ACCESS_PASS.contractAddress) {
    return null;
  }

  const walletAddress = profile.primaryWalletAddress || profile.primaryWalletAddressLower;

  if (!walletAddress) {
    return null;
  }

  const publicClient = createPublicClient({
    transport: http(ARC_TESTNET.rpcUrl),
  });

  const contractAddress = DOGECORD_ACCESS_PASS.contractAddress as `0x${string}`;
  const contractAddressLower = normalizeAddress(DOGECORD_ACCESS_PASS.contractAddress);
  const account = walletAddress as `0x${string}`;
  const accountLower = normalizeAddress(walletAddress);

  let existingPass = await getActiveAccessPassForProfile(profile.id);

  /**
   * Important:
   * If the DB pass belongs to an older contract, never verify its tokenId
   * against the new contract. Revoke it and resync from the current contract.
   */
  if (
    existingPass &&
    normalizeAddress(existingPass.contractAddress) !== contractAddressLower
  ) {
    await db.accessPass.update({
      where: {
        id: existingPass.id,
      },
      data: {
        status: AccessPassStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    existingPass = null;
  }

  /**
   * Existing pass belongs to current contract.
   * Now it is safe to verify ownerOf(existingPass.tokenId).
   */
  if (existingPass && /^\d+$/.test(existingPass.tokenId)) {
    const passToVerify = existingPass;

    try {
      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: DOGECORD_ACCESS_PASS_ABI,
        functionName: "ownerOf",
        args: [BigInt(passToVerify.tokenId)],
      });

      if (normalizeAddress(owner) === accountLower) {
        return passToVerify;
      }

      await db.accessPass.update({
        where: {
          id: passToVerify.id,
        },
        data: {
          status: AccessPassStatus.REVOKED,
          revokedAt: new Date(),
        },
      });

      existingPass = null;
    } catch (error) {
      console.log("[ACCESS_PASS_EXISTING_OWNER_CHECK]", error);

      await db.accessPass.update({
        where: {
          id: passToVerify.id,
        },
        data: {
          status: AccessPassStatus.REVOKED,
          revokedAt: new Date(),
        },
      });

      existingPass = null;
    }
  }

  const balance = await publicClient.readContract({
    address: contractAddress,
    abi: DOGECORD_ACCESS_PASS_ABI,
    functionName: "balanceOf",
    args: [account],
  });

  if (balance === BigInt(0)) {
    return null;
  }

  const hasActivePass = await publicClient
    .readContract({
      address: contractAddress,
      abi: DOGECORD_ACCESS_PASS_ABI,
      functionName: "hasActivePass",
      args: [account],
    })
    .catch(async () => {
      return publicClient
        .readContract({
          address: contractAddress,
          abi: DOGECORD_ACCESS_PASS_ABI,
          functionName: "hasMinted",
          args: [account],
        })
        .catch(() => balance > BigInt(0));
    });

  if (!hasActivePass) {
    return null;
  }

  const tokenId = await publicClient
    .readContract({
      address: contractAddress,
      abi: DOGECORD_ACCESS_PASS_ABI,
      functionName: "tokenOf",
      args: [account],
    })
    .catch(async () => {
      return publicClient
        .readContract({
          address: contractAddress,
          abi: DOGECORD_ACCESS_PASS_ABI,
          functionName: "mintedTokenId",
          args: [account],
        })
        .catch(() =>
          findOwnedTokenIdFromTransferLogs({
            publicClient,
            contractAddress,
            account,
          })
        );
    });

  if (!tokenId || tokenId === BigInt(0)) {
    return null;
  }

  try {
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: DOGECORD_ACCESS_PASS_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    });

    if (normalizeAddress(owner) !== accountLower) {
      return null;
    }
  } catch (error) {
    console.log("[ACCESS_PASS_OWNER_CHECK]", error);
    return null;
  }

  return db.accessPass.create({
    data: {
      walletAddress,
      walletAddressLower: accountLower,
      chainId: DOGECORD_ACCESS_PASS.chainId,
      contractAddress: DOGECORD_ACCESS_PASS.contractAddress,
      contractAddressLower,
      tokenId: tokenId.toString(),
      txHash: `sync:${DOGECORD_ACCESS_PASS.contractAddress}:${tokenId.toString()}`,
      tier: AccessPassTier.LIFETIME,
      profileId: profile.id,
      mintedAt: new Date(),
    },
  });
};

export const hasActiveAccessPassForProfile = async (profileId: string) => {
  const pass = await getActiveAccessPassForProfile(profileId);

  return !!pass;
};

export const findProfileByWallet = async (walletAddress: string) => {
  return db.profile.findFirst({
    where: {
      wallets: {
        some: {
          addressLower: normalizeAddress(walletAddress),
        }
      }
    }
  });
};
