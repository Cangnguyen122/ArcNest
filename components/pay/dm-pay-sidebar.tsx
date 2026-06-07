"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { Clock, FileText, ImageIcon, LinkIcon, Loader2, Lock, PlaySquare, Send, ShieldCheck, Users, Video, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";

interface DmPaySidebarProps {
  conversationId: string;
  recipientProfileId: string;
  name: string;
  bio: string;
  imageUrl: string;
  walletAddress: string | null;
}

const usdcAmountPattern = /^\d+(\.\d{1,18})?$/;

type SharedType = "videos" | "photos" | "files" | "links" | "gifs" | "mutual-groups";

const sharedSections: {
  type: SharedType;
  label: string;
  icon: typeof Video;
}[] = [
  {
    type: "videos",
    label: "Videos",
    icon: Video,
  },
  {
    type: "photos",
    label: "Photos",
    icon: ImageIcon,
  },
  {
    type: "files",
    label: "Files",
    icon: FileText,
  },
  {
    type: "links",
    label: "Links",
    icon: LinkIcon,
  },
  {
    type: "gifs",
    label: "GIFs",
    icon: PlaySquare,
  },
  {
    type: "mutual-groups",
    label: "Mutual groups",
    icon: Users,
  },
];

type SharedItem = {
  id: string;
  name?: string;
  imageUrl?: string;
  content?: string;
  fileUrl?: string | null;
  fileKind?: string;
  createdAt?: string;
  member?: {
    profile: {
      name: string;
    };
  };
};

const SharedMediaThumb = ({
  item,
  activeSharedType,
}: {
  item: SharedItem;
  activeSharedType: SharedType;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const shouldProbeImage = !!item.fileUrl && activeSharedType === "photos" && !imageLoaded && !imageFailed;
  const showImage = !!item.fileUrl && (
    activeSharedType === "gifs" ||
    activeSharedType === "photos" ||
    imageLoaded
  );

  if (shouldProbeImage) {
    return (
      <>
        <img
          src={item.fileUrl || ""}
          alt=""
          className="hidden"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </>
    );
  }

  if (showImage && item.fileUrl) {
    return (
      <img
        src={item.fileUrl}
        alt={item.content || "Shared media"}
        className="h-10 w-10 shrink-0 rounded-md object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {activeSharedType === "links" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
    </div>
  );
};

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
  const [activeSharedType, setActiveSharedType] = useState<SharedType>("photos");
  const [previewItem, setPreviewItem] = useState<SharedItem | null>(null);

  const amountError = amount ? getUsdcAmountError(amount) : "";
  const priceError = price ? getUsdcAmountError(price) : "";
  const durationError = durationHours && (!/^\d+$/.test(durationHours) || Number(durationHours) < 1)
    ? "Duration must be a whole number of hours."
    : "";

  const sharedQuery = useQuery({
    queryKey: ["conversation-shared", conversationId, activeSharedType],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${conversationId}?type=${activeSharedType}`);

      if (!response.ok) {
        throw new Error("Could not load shared items");
      }

      return response.json() as Promise<{ items: SharedItem[] }>;
    },
  });

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
      <aside className="hidden w-80 shrink-0 border-l border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-[#2B2D31] xl:block">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="h-16 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400" />
          <div className="-mt-10 px-4 pb-4">
            <UserAvatar
              src={imageUrl}
              className="h-20 w-20 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.24)] ring-2 ring-white/70 dark:ring-zinc-950/70"
            />
            <div className="mt-3 min-w-0">
              <h2 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {name}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                {bio || "No bio yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-400">Wallet</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {shortAddress(walletAddress)}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              {walletAddress ? "Linked" : "Missing"}
            </span>
          </div>
          {walletAddress && (
            <p className="mt-3 break-all rounded-md bg-zinc-50 px-2 py-2 font-mono text-[11px] leading-4 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {walletAddress}
            </p>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Shared
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {sharedSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSharedType === section.type;

              return (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => setActiveSharedType(section.type)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold transition",
                    isActive
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isActive
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 truncate">{section.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-zinc-100 bg-zinc-50/70 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
            {sharedQuery.isLoading && (
              <div className="flex items-center justify-center py-6 text-xs text-zinc-500">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading
              </div>
            )}
            {!sharedQuery.isLoading && (!sharedQuery.data?.items || sharedQuery.data.items.length === 0) && (
              <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nothing shared yet.
              </div>
            )}
            {!sharedQuery.isLoading && sharedQuery.data?.items?.map((item) => {
              if (activeSharedType === "mutual-groups") {
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-2">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name || "Server"} className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-800">
                        <Users className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}
                    <span className="min-w-0 truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      {item.name}
                    </span>
                  </div>
                );
              }

              const href = item.fileUrl || item.content || "";
              const displayText = item.content || item.fileUrl || "Shared item";
              const opensInlinePreview = ["photos", "gifs", "videos"].includes(activeSharedType);
              const SharedItemTag = opensInlinePreview ? "button" : "a";

              return (
                <SharedItemTag
                  key={item.id}
                  {...(opensInlinePreview
                    ? {
                        type: "button",
                        onClick: () => setPreviewItem(item),
                      }
                    : {
                        href,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white dark:hover:bg-zinc-800"
                >
                  <SharedMediaThumb item={item} activeSharedType={activeSharedType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      {displayText}
                    </p>
                    {item.createdAt && (
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {item.member?.profile.name} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </SharedItemTag>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={!walletAddress}
            onClick={() => {
              setError("");
              setTransferOpen(true);
            }}
            className="group flex items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500 px-3 py-3 text-left text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/15 transition group-hover:bg-white/20">
              <Send className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Transfer USDC</span>
              <span className="block truncate text-xs text-indigo-100">Send funds on Arc Testnet</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setInviteOpen(true);
            }}
            className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 transition group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-700">
              <Lock className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-zinc-950 dark:text-zinc-50">Paid Room Invite</span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">Create timed private access</span>
            </span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <p className="mt-2 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">Verified wallet flow</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <Clock className="h-4 w-4 text-cyan-500" />
            <p className="mt-2 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">Timed room access</p>
          </div>
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

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-0 text-white shadow-2xl">
          {previewItem?.fileUrl && activeSharedType === "videos" ? (
            <video
              src={previewItem.fileUrl}
              controls
              autoPlay
              className="max-h-[80vh] w-full rounded-md bg-black"
            />
          ) : previewItem?.fileUrl ? (
            <img
              src={previewItem.fileUrl}
              alt={previewItem.content || "Shared media"}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
