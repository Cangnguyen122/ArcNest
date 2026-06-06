"use client";

import axios from "axios";
import { Loader2, Lock, Send, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useNetwork, usePublicClient, useSwitchNetwork, useWalletClient } from "wagmi";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ARC_TESTNET, ARCNEST_PAY } from "@/lib/web3/arc";

interface DmPaySidebarProps {
  conversationId: string;
  recipientProfileId: string;
  name: string;
  bio: string;
  imageUrl: string;
  walletAddress: string | null;
}

const usdcAmountPattern = /^\d+(\.\d{1,18})?$/;

const getUsdcAmountError = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Enter a USDC amount.";
  }

  if (!usdcAmountPattern.test(trimmed)) {
    return "Use numbers only, with up to 18 decimals.";
  }

  if (Number(trimmed) <= 0) {
    return "Amount must be greater than 0.";
  }

  return "";
};

export const DmPaySidebar = ({
  conversationId,
  recipientProfileId,
  name,
  bio,
  imageUrl,
  walletAddress,
}: DmPaySidebarProps) => {
  const router = useRouter();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchNetworkAsync } = useSwitchNetwork();
  const [transferOpen, setTransferOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [durationHours, setDurationHours] = useState("24");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const amountError = amount ? getUsdcAmountError(amount) : "";
  const priceError = price ? getUsdcAmountError(price) : "";
  const durationError = durationHours && (!/^\d+$/.test(durationHours) || Number(durationHours) < 1)
    ? "Duration must be a whole number of hours."
    : "";

  const shortAddress = (value?: string | null) => {
    if (!value) {
      return "Not connected";
    }

    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const ensureWalletReady = async () => {
    if (!address || !walletClient) {
      setError("Connect a wallet first.");
      return false;
    }

    if (chain?.id !== ARC_TESTNET.id) {
      if (!switchNetworkAsync) {
        setError(`Switch your wallet to ${ARC_TESTNET.name}.`);
        return false;
      }

      await switchNetworkAsync(ARC_TESTNET.id);
    }

    return true;
  };

  const transferUsdc = async () => {
    setIsLoading(true);
    setError("");

    try {
      const validationError = getUsdcAmountError(amount);

      if (validationError) {
        setError(validationError);
        return;
      }

      if (!walletAddress || !(await ensureWalletReady())) {
        return;
      }

      const normalizedAmount = amount.trim();
      const amountUnits = parseUnits(normalizedAmount, ARCNEST_PAY.usdcDecimals).toString();
      const txHash = await walletClient!.sendTransaction({
        account: address as `0x${string}`,
        to: walletAddress as `0x${string}`,
        value: BigInt(amountUnits),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      await axios.post("/api/payments/transfer-record", {
        conversationId,
        recipientProfileId,
        amount: normalizedAmount,
        amountUnits,
        note,
        txHash,
      });

      setTransferOpen(false);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (error) {
      console.log(error);
      setError("Transfer could not be confirmed.");
    } finally {
      setIsLoading(false);
    }
  };

  const createInvite = async () => {
    setIsLoading(true);
    setError("");

    try {
      const validationError = getUsdcAmountError(price) || durationError;

      if (validationError) {
        setError(validationError);
        return;
      }

      const normalizedPrice = price.trim();
      const priceUnits = parseUnits(normalizedPrice, ARCNEST_PAY.usdcDecimals).toString();

      await axios.post("/api/private-room-invites", {
        conversationId,
        priceUsdc: normalizedPrice,
        priceUsdcUnits: priceUnits,
        durationHours: Number(durationHours),
        description,
      });

      setInviteOpen(false);
      setPrice("");
      setDurationHours("24");
      setDescription("");
      router.refresh();
    } catch (error) {
      console.log(error);
      setError("Could not create paid room invite.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-l border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-[#2B2D31] xl:block">
        <div className="flex flex-col items-center text-center">
          <UserAvatar src={imageUrl} className="h-20 w-20" />
          <h2 className="mt-3 max-w-full truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {name}
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {bio || "No bio yet."}
          </p>
        </div>
        <div className="mt-5 rounded-md bg-white p-3 text-xs dark:bg-zinc-900/40">
          <span className="block font-semibold uppercase text-zinc-400">Wallet</span>
          <p className="mt-1 break-all text-zinc-700 dark:text-zinc-300">
            {walletAddress || "No wallet linked"}
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={!walletAddress}
            onClick={() => {
              setError("");
              setTransferOpen(true);
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Transfer USDC
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setError("");
              setInviteOpen(true);
            }}
          >
            <Lock className="mr-2 h-4 w-4" />
            Paid Room Invite
          </Button>
        </div>
      </aside>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-white p-0 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">Transfer USDC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid gap-1">
                <p><span className="text-zinc-500 dark:text-zinc-400">Recipient:</span> {name}</p>
                <p className="break-all"><span className="text-zinc-500 dark:text-zinc-400">Wallet:</span> {walletAddress}</p>
                <p><span className="text-zinc-500 dark:text-zinc-400">Network:</span> {ARC_TESTNET.name}</p>
                <p><span className="text-zinc-500 dark:text-zinc-400">Token:</span> Native USDC</p>
                <p><span className="text-zinc-500 dark:text-zinc-400">From:</span> {shortAddress(address)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Amount
              </label>
              <div className="relative">
                <Input
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError("");
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  className="h-12 border-zinc-300 bg-white pr-16 text-base text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
                  USDC
                </span>
              </div>
              {amountError && (
                <p className="text-xs text-rose-600">{amountError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Note
              </label>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
                className="h-11 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <p className="text-xs text-rose-600">
              Transfers on {ARC_TESTNET.name} are irreversible after wallet confirmation.
            </p>
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>
          <DialogFooter className="mt-2 bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
            <Button type="button" variant="primary" disabled={isLoading || !amount || !!amountError} onClick={transferUsdc}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Confirm in wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-white p-0 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">Create paid private room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Price</label>
              <div className="relative">
                <Input
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    setError("");
                  }}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-11 border-zinc-300 bg-white pr-16 text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
                  USDC
                </span>
              </div>
              {priceError && <p className="text-xs text-rose-600">{priceError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Duration</label>
              <Input
                value={durationHours}
                onChange={(event) => {
                  setDurationHours(event.target.value);
                  setError("");
                }}
                inputMode="numeric"
                placeholder="24"
                className="h-11 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              {durationError && <p className="text-xs text-rose-600">{durationError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Description</label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this private room gives access to"
                className="h-11 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <p className="text-xs text-zinc-500">
              This grants timed access only. It is not escrow, a job, or a marketplace listing.
            </p>
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>
          <DialogFooter className="mt-2 bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
            <Button type="button" variant="primary" disabled={isLoading || !price || !!priceError || !!durationError || !description} onClick={createInvite}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Create invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
