"use client";

import type { AccessPass } from "@prisma/client";
import { Award, ExternalLink, Gem, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ACCESS_PASS_NAME } from "@/lib/brand";
import { ARC_TESTNET, DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

type AccessPassNftCardProps = {
  pass: AccessPass | null;
  walletAddress?: string | null;
  tokenBaseUri?: string;
};

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
};

const ipfsToGatewayUrl = (uri?: string | null) => {
  if (!uri) return "";

  if (uri.startsWith("ipfs://")) {
    const value = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${value}`;
  }

  return uri;
};

const tokenUriFromBase = (baseUri?: string) => {
  if (!baseUri) return "";

  return baseUri.trim();
};

const shortenAddress = (address?: string | null) => {
  if (!address) return "No wallet";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const AccessPassNftCard = ({
  pass,
  walletAddress,
  tokenBaseUri,
}: AccessPassNftCardProps) => {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [metadataError, setMetadataError] = useState(false);

  const tokenUri = useMemo(() => tokenUriFromBase(tokenBaseUri), [tokenBaseUri]);
  const metadataUrl = useMemo(() => ipfsToGatewayUrl(tokenUri), [tokenUri]);
  const fallbackImageUrl =
  "https://lavender-calm-anteater-670.mypinata.cloud/ipfs/bafybeihwfgj7qdqzem45sdf5v4wyjhcvyig7v3edgmk42kfxiljunvgieq/arcnest-access-pass.png";

  const imageUrl = ipfsToGatewayUrl(metadata?.image) || fallbackImageUrl;
  const explorerUrl = pass
    ? `${ARC_TESTNET.blockExplorerUrl}/token/${DOGECORD_ACCESS_PASS.contractAddress}?a=${pass.tokenId}`
    : ARC_TESTNET.blockExplorerUrl;

  useEffect(() => {
    let cancelled = false;

    setMetadata(null);
    setMetadataError(false);

    if (!metadataUrl) {
      return;
    }

    fetch(metadataUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Metadata not reachable");
        }

        return res.json();
      })
      .then((data: TokenMetadata) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadataError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [metadataUrl]);

  return (
    <aside className="relative overflow-hidden rounded-[32px] border border-cyan-300/20 bg-[#07111C]/95 shadow-[0_30px_100px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(34,211,238,0.34),transparent_28%),radial-gradient(circle_at_88%_20%,rgba(168,85,247,0.24),transparent_27%),linear-gradient(135deg,rgba(88,101,242,0.18),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />

      <div className="relative p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Access NFT
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
              {metadata?.name || ACCESS_PASS_NAME}
            </h2>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.08] text-cyan-200 shadow-[0_14px_34px_rgba(34,211,238,0.18)]">
            <Gem className="h-6 w-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[26px] border border-white/[0.12] bg-black/30 p-3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.16),transparent_34%)]" />
          <div className="relative aspect-square overflow-hidden rounded-[20px] border border-white/10 bg-[#101827]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={metadata?.name || ACCESS_PASS_NAME}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_18%,rgba(34,211,238,0.35),transparent_30%),linear-gradient(145deg,#111827,#312E81_52%,#062A31)] px-6 text-center">
                <Award className="mb-4 h-16 w-16 text-cyan-200 drop-shadow-[0_0_22px_rgba(34,211,238,0.5)]" />
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
                  ArcNest
                </p>
                <p className="mt-2 text-3xl font-black text-white">Lifetime Pass</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 min-h-[48px] text-sm leading-6 text-zinc-300">
          {metadata?.description ||
            "A shared ArcNest access pass for verified holders, community rooms, and future Arc experiences."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Token</p>
            <p className="mt-1 font-mono text-sm font-black text-white">#{pass?.tokenId || "--"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Wallet</p>
            <p className="mt-1 font-mono text-sm font-black text-white">{shortenAddress(walletAddress)}</p>
          </div>
        </div>

        {/* <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide text-emerald-200">
              {pass ? "Verified holder" : "Waiting for sync"}
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.95)]" />
          </div>
          {metadataError && (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Metadata is on-chain, but the gateway did not answer yet.
            </p>
          )}
        </div> */}

        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-24 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] text-sm font-black text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
        >
          View on Arcscan
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>
    </aside>
  );
};
