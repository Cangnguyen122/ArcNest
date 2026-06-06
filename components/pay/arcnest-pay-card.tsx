"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, ExternalLink, Loader2, Lock, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";

import { Button } from "@/components/ui/button";
import { ARC_TESTNET, ARCNEST_PAY } from "@/lib/web3/arc";

interface ArcNestPayCardProps {
  payload: any;
  currentProfileId: string;
}

const shortHash = (value?: string) => {
  if (!value) return "";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

const getStatus = (value?: string) => {
  return String(value || "CONFIRMED").toUpperCase();
};

const getStatusClass = (status: string) => {
  if (status === "CONFIRMED" || status === "PAID" || status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700";
};

export const ArcNestPayCard = ({
  payload,
  currentProfileId,
}: ArcNestPayCardProps) => {
  const router = useRouter();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchNetworkAsync } = useSwitchNetwork();

  const [status, setStatus] = useState(payload.status || "ACTIVE");
  const [serverId, setServerId] = useState(payload.serverId || "");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (payload.kind !== "private_room_invite" || !payload.inviteId) {
      return;
    }

    const loadInvite = async () => {
      try {
        const response = await axios.get(
          `/api/private-room-invites/${payload.inviteId}`
        );

        setStatus(response.data.status);
        setServerId(response.data.serverId || payload.serverId || "");
        setExpiresAt(response.data.access?.expiresAt || null);
      } catch {
        return;
      }
    };

    loadInvite();
  }, [payload]);

  const payAndJoin = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!address || !walletClient) {
        setError("Connect a wallet before paying.");
        return;
      }

      if (chain?.id !== ARC_TESTNET.id) {
        if (!switchNetworkAsync) {
          setError(`Switch your wallet to ${ARC_TESTNET.name}.`);
          return;
        }

        await switchNetworkAsync(ARC_TESTNET.id);
      }

      const amountUnits =
        payload.priceUsdcUnits ||
        parseUnits(
          String(payload.priceUsdc),
          ARCNEST_PAY.usdcDecimals
        ).toString();

      const txHash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: payload.creatorWallet as `0x${string}`,
        value: BigInt(amountUnits),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const response = await axios.post(
        `/api/private-room-invites/${payload.inviteId}/pay`,
        { txHash }
      );

      setStatus(response.data.invite.status);
      setServerId(response.data.invite.serverId);
      setExpiresAt(response.data.access.expiresAt);
      router.refresh();
    } catch (error) {
      console.log(error);
      setError("Payment could not be confirmed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (payload.kind === "p2p_transfer") {
    const transferStatus = getStatus(payload.status);
    const currency = payload.currency || "USDC";
    const network = payload.network || "Arc Testnet";

    return (
      <div className="mt-2 max-w-[340px] overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/70 to-indigo-50/70 p-[1px] shadow-[0_10px_30px_rgba(79,70,229,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(79,70,229,0.16)] dark:border-cyan-400/20 dark:from-zinc-950 dark:via-cyan-950/20 dark:to-indigo-950/20">
        <div className="rounded-2xl bg-white/90 p-3 backdrop-blur dark:bg-zinc-950/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
                <CheckCircle className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[13px] font-bold leading-none text-zinc-950 dark:text-zinc-50">
                  USDC sent
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  ArcNest Pay
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
                transferStatus
              )}`}
            >
              {transferStatus}
            </span>
          </div>

          <div className="mt-3 flex items-end gap-1">
            <span className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              {payload.amount}
            </span>
            <span className="pb-1 text-xs font-black text-cyan-600 dark:text-cyan-300">
              {currency}
            </span>
          </div>

          {payload.note && (
            <div className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-xs text-zinc-700 dark:border-cyan-400/10 dark:bg-cyan-950/20 dark:text-zinc-200">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Note:</span>{" "}
              {payload.note}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{network}</span>

            {payload.txHash && (
              <>
                <span>•</span>
                <span className="font-mono">{shortHash(payload.txHash)}</span>
              </>
            )}

            {payload.explorerUrl && (
              <>
                <span>•</span>
                <a
                  href={payload.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (payload.kind !== "private_room_invite") {
    return null;
  }

  const isRecipient = payload.recipientProfileId === currentProfileId;
  const isPaid = status === "PAID";
  const statusLabel = getStatus(status);

  return (
    <div className="mt-2 max-w-[360px] overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/70 p-[1px] shadow-[0_10px_30px_rgba(99,102,241,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(99,102,241,0.16)] dark:border-violet-400/20 dark:from-zinc-950 dark:via-violet-950/20 dark:to-indigo-950/20">
      <div className="rounded-2xl bg-white/90 p-3 backdrop-blur dark:bg-zinc-950/90">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-sm">
              <Lock className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[13px] font-bold leading-none text-zinc-950 dark:text-zinc-50">
                Paid private room
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Unlock access with USDC
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
              statusLabel
            )}`}
          >
            {statusLabel}
          </span>
        </div>

        {payload.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {payload.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Price
            </p>
            <p className="text-base font-black text-zinc-950 dark:text-white">
              {payload.priceUsdc}
              <span className="ml-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                USDC
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Duration
            </p>
            <p className="text-base font-black text-zinc-950 dark:text-white">
              {payload.durationHours}h
            </p>
          </div>
        </div>

        {expiresAt && (
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Expires {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          {isRecipient && !isPaid && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={isLoading}
              onClick={payAndJoin}
              className="h-8 rounded-xl text-xs"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-3.5 w-3.5" />
              )}
              Pay & Join
            </Button>
          )}

          {isPaid && serverId && (
            <Button
              asChild
              type="button"
              size="sm"
              variant="primary"
              className="h-8 rounded-xl text-xs"
            >
              <Link href={`/servers/${serverId}`}>Open room</Link>
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
