"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CircleDollarSign, ExternalLink, KeyRound, Loader2, Radio, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useNetwork, usePublicClient, useSignMessage, useSwitchNetwork, useWalletClient } from "wagmi";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { DOGECORD_ACCESS_PASS_ABI, ERC20_APPROVE_ABI } from "@/lib/web3/access-pass-abi";
import { ARC_TESTNET, DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";

type WalletSession = {
  profile: {
    id: string;
    name: string;
  };
  wallet: {
    address: string;
    chainId: number;
  };
};

type PassState = {
  hasPass: boolean;
  pass: unknown;
};

const normalizeAddress = (value?: string | null) => value?.trim().toLowerCase() || "";
const shortAddress = (value?: string | null) => {
  if (!value) return "Not connected";

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const readResponseError = async (response: Response, fallback: string) => {
  const message = await response.text();

  return message || fallback;
};

const highlights = [
  {
    icon: ShieldCheck,
    label: "Session locked",
    description: "The connected wallet must match the signed ArcNest session before minting or syncing.",
  },
  {
    icon: Radio,
    label: "Arc House live",
    description: "Verified holders enter shared channels, realtime rooms, and future holder utilities.",
  },
  {
    icon: CircleDollarSign,
    label: "10 USDC pass",
    description: "The gateway mints or syncs the configured ArcNest Lifetime Pass contract.",
  },
];

const GatewayLoading = () => {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050812] px-4 text-zinc-100">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url('/nft/backgrounds/arc-house-digital-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,8,18,0.98)_0%,rgba(12,17,29,0.82)_45%,rgba(5,8,18,0.98)_100%)]" />
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/12 bg-[#0B101C]/78 px-5 py-4 shadow-[0_30px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        <div>
          <p className="text-sm font-black">{APP_NAME}</p>
          <p className="text-xs text-zinc-400">Preparing wallet gateway...</p>
        </div>
      </div>
    </main>
  );
};

export const ArcNestGateway = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { signMessageAsync } = useSignMessage();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [session, setSession] = useState<WalletSession | null>(null);
  const [passState, setPassState] = useState<PassState | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState("");
  const enterAppStartedRef = useRef(false);

  const activeWallet = normalizeAddress(address);
  const sessionWallet = normalizeAddress(session?.wallet.address);
  const isWrongNetwork = isConnected && chain?.id !== ARC_TESTNET.id;
  const hasContract = !!DOGECORD_ACCESS_PASS.contractAddress;
  const walletMismatch = !!activeWallet && !!sessionWallet && activeWallet !== sessionWallet;
  const sessionMatchesWallet = !!activeWallet && !!sessionWallet && activeWallet === sessionWallet;
  const canCheckPass = !!session && sessionMatchesWallet && !isWrongNetwork;

  const status = useMemo(() => {
    if (isChecking) return "Checking";
    if (!isConnected) return "Wallet required";
    if (isWrongNetwork) return "Wrong network";
    if (!session) return "Signature required";
    if (walletMismatch) return "Wallet changed";
    if (passState?.hasPass) return "Pass verified";
    if (isSyncing) return "Syncing pass";
    if (isMinting) return "Minting";
    return "Pass required";
  }, [isChecking, isConnected, isWrongNetwork, session, walletMismatch, passState, isSyncing, isMinting]);

  const statusClassName = status === "Pass verified"
    ? "font-black text-emerald-300"
    : status === "Wrong network" || status === "Wallet changed"
      ? "font-black text-amber-300"
      : "font-black text-zinc-200";

  const switchToArc = useCallback(async () => {
    if (!switchNetworkAsync) {
      setError(`Please switch your wallet to ${ARC_TESTNET.name}.`);
      return false;
    }

    try {
      setError("");
      await switchNetworkAsync(ARC_TESTNET.id);
      return true;
    } catch (error) {
      console.log(error);
      setError(`Please switch your wallet to ${ARC_TESTNET.name} to continue.`);
      return false;
    }
  }, [switchNetworkAsync]);

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/auth/wallet/me", {
      cache: "no-store",
    });

    if (!response.ok) {
      setSession(null);
      setPassState(null);
      return null;
    }

    const nextSession = await response.json() as WalletSession;
    setSession(nextSession);
    return nextSession;
  }, []);

  const loadPass = useCallback(async () => {
    const response = await fetch("/api/access-pass/me", {
      cache: "no-store",
    });

    if (!response.ok) {
      const emptyPassState: PassState = {
        hasPass: false,
        pass: null,
      };

      setPassState(emptyPassState);
      return emptyPassState;
    }

    const nextPassState = (await response.json()) as PassState;
    setPassState(nextPassState);
    return nextPassState;
  }, []);

  const syncExistingPass = useCallback(async () => {
    setIsSyncing(true);
    setError("");

    try {
      const response = await fetch("/api/access-pass/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "No minted pass was found for this wallet."));
      }

      const pass = await response.json();
      setPassState({
        hasPass: true,
        pass,
      });
      return pass;
    } catch (error) {
        console.log(error);

        setPassState({
          hasPass: false,
          pass: null,
        });

        setError(
          error instanceof Error
            ? error.message
            : "No minted pass was found for this wallet."
        );

        return null;
      } finally {
        setIsSyncing(false);
      }
  }, []);

  const enterApp = useCallback(async () => {
    if (enterAppStartedRef.current) {
      return;
    }

    enterAppStartedRef.current = true;
    setIsEntering(true);
    setError("");

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Could not open Arc House."));
      }

      const data = await response.json() as { serverId: string };
      router.replace(`/servers/${data.serverId}`);
    } catch (error) {
      enterAppStartedRef.current = false;
      console.log(error);
      setError(error instanceof Error ? error.message : "Could not open Arc House.");
    } finally {
      setIsEntering(false);
    }
  }, [router]);

  const signIn = async () => {
    if (!address) {
      setError("Connect a wallet before signing in.");
      return;
    }

    setIsSigning(true);
    setError("");

    try {
      let activeChainId = chain?.id;

      if (activeChainId !== ARC_TESTNET.id) {
        const switched = await switchToArc();

        if (!switched) {
          return;
        }

        activeChainId = ARC_TESTNET.id;
      }

      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          chainId: activeChainId,
        }),
      });

      if (!challengeResponse.ok) {
        throw new Error(await readResponseError(challengeResponse, "Could not create login challenge."));
      }

      const challenge = await challengeResponse.json();
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          chainId: activeChainId,
          nonce: challenge.nonce,
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(await readResponseError(verifyResponse, "Wallet signature could not be verified."));
      }

      const nextSession = await verifyResponse.json() as WalletSession;
      setSession(nextSession);
      setPassState(null);
      router.refresh();
    } catch (error) {
      console.log(error);
      setError(error instanceof Error ? error.message : "Wallet sign-in failed. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const mintPass = async () => {
    if (!address || !walletClient) {
      setError("Connect and sign in with a wallet before minting.");
      return;
    }

    if (!sessionMatchesWallet) {
      setError("Sign in with the connected wallet before minting.");
      return;
    }

    setIsMinting(true);
    setError("");

    try {
      if (isWrongNetwork) {
        const switched = await switchToArc();

        if (!switched) {
          return;
        }
      }

      if (!hasContract) {
        const response = await fetch("/api/access-pass/dev-claim", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(await readResponseError(response, "Could not activate dev pass."));
        }

        const pass = await response.json();
        setPassState({ hasPass: true, pass });
        return;
      }

      if (!DOGECORD_ACCESS_PASS.contractAddress || !DOGECORD_ACCESS_PASS.usdcAddress) {
        throw new Error("Configure the NFT pass contract and USDC address before production checkout.");
      }

      const passContract = DOGECORD_ACCESS_PASS.contractAddress as `0x${string}`;
      const usdcContract = DOGECORD_ACCESS_PASS.usdcAddress as `0x${string}`;
      const price = BigInt(DOGECORD_ACCESS_PASS.priceUsdcUnits);

      const existingBalance = await publicClient.readContract({
        address: passContract,
        abi: DOGECORD_ACCESS_PASS_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (existingBalance > BigInt(0)) {
        const pass = await syncExistingPass();

        if (!pass) {
          throw new Error("This wallet owns a pass, but the app could not sync it from the contract.");
        }

        return;
      }

      if (price > BigInt(0)) {
        const usdcBalance = await publicClient.readContract({
          address: usdcContract,
          abi: ERC20_APPROVE_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        if (usdcBalance < price) {
          throw new Error(`Not enough USDC on ${ARC_TESTNET.name}. Faucet funds are required before minting.`);
        }

        const approveHash = await walletClient.writeContract({
          account: address,
          address: usdcContract,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [passContract, price],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const mintHash = await walletClient.writeContract({
        account: address,
        address: passContract,
        abi: DOGECORD_ACCESS_PASS_ABI,
        functionName: "mint",
      });

      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      const recordResponse = await fetch("/api/access-pass/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: mintHash,
        }),
      });

      if (!recordResponse.ok) {
        throw new Error(await readResponseError(recordResponse, "Could not record minted pass."));
      }

      const pass = await recordResponse.json();
      setPassState({ hasPass: true, pass });
    } catch (error) {
      console.log(error);
      setError(error instanceof Error ? error.message : "Could not activate your Arc pass. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadSession();
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [loadSession]);

  useEffect(() => {
    if (!canCheckPass || passState?.hasPass) {
      return;
    }

    let isMounted = true;

    const checkPass = async () => {
      const localPassState = await loadPass();

      if (!isMounted) {
        return;
      }

      if (!localPassState?.hasPass) {
        setPassState({
          hasPass: false,
          pass: null,
        });
      }
    };

    checkPass();

    return () => {
      isMounted = false;
    };
  }, [canCheckPass, passState?.hasPass, loadPass]);

  useEffect(() => {
    if (canCheckPass && passState?.hasPass && !isEntering) {
      enterApp();
    }
  }, [canCheckPass, passState?.hasPass, isEntering, enterApp]);

  const primaryAction = () => {
    if (!isConnected) return null;

    if (isWrongNetwork) {
      return (
        <Button type="button" variant="primary" className="mt-4 h-12 w-full gap-2 bg-[#5865F2] font-black hover:bg-[#4752C4]" onClick={switchToArc}>
          <Wallet className="h-4 w-4" />
          Switch to {ARC_TESTNET.name}
        </Button>
      );
    }

    if (!session || walletMismatch) {
      return (
        <Button type="button" variant="primary" className="mt-4 h-12 w-full gap-2 bg-[#5865F2] font-black hover:bg-[#4752C4]" disabled={isSigning} onClick={signIn}>
          {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {walletMismatch ? "Sign in with this wallet" : "Sign message"}
        </Button>
      );
    }

    if (passState?.hasPass) {
      return (
        <Button type="button" variant="primary" className="mt-4 h-12 w-full gap-2 bg-emerald-600 font-black hover:bg-emerald-500" disabled={isEntering} onClick={enterApp}>
          {isEntering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Enter Arc House
        </Button>
      );
    }

    return (
      <Button type="button" variant="primary" className="mt-4 h-12 w-full gap-2 bg-[#5865F2] font-black hover:bg-[#4752C4]" disabled={isMinting || isSyncing} onClick={mintPass}>
        {isMinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {hasContract ? "Mint NFT pass" : "Activate dev pass"}
      </Button>
    );
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <GatewayLoading />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050812] text-zinc-100">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url('/nft/backgrounds/arc-house-digital-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(3,7,18,0.98)_0%,rgba(8,15,31,0.86)_40%,rgba(4,10,24,0.96)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.034)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.034)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),transparent)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1540px] grid-cols-1 items-center gap-6 px-4 py-5 md:px-8 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-[16px] border border-cyan-300/35 bg-white/[0.05] shadow-[0_0_34px_rgba(34,211,238,0.2)]">
                <Image src="/arc-nest.png" alt={APP_NAME} width={42} height={42} className="h-10 w-10 object-contain" priority />
              </div>
              <div>
                <p className="text-sm font-black">{APP_NAME}</p>
                <p className="text-xs text-zinc-400">Arc-native social access terminal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
              <Radio className="h-4 w-4" />
              Holder gateway online
            </div>
          </div>

          <div className="relative min-h-[660px] overflow-hidden rounded-2xl border border-white/12 bg-[#071120] shadow-[0_36px_110px_rgba(0,0,0,0.64),0_0_90px_rgba(34,211,238,0.12)]">
            <Image
              src="/nft/backgrounds/arc-house-digital-bg.png"
              alt="ArcNest digital house"
              fill
              className="object-cover opacity-70"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,18,0.96)_0%,rgba(5,12,27,0.78)_42%,rgba(5,10,22,0.54)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_20%_84%,rgba(88,101,242,0.28),transparent_32%)]" />

            <div className="relative flex min-h-[660px] flex-col justify-between p-5 md:p-8 lg:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-3 rounded-xl border border-white/12 bg-black/24 px-3 py-2 backdrop-blur-xl">
                  <Image src="/arc-nest.png" alt="ArcNest" width={34} height={34} className="h-8 w-8 object-contain" />
                  <div>
                    <p className="text-sm font-black">ArcNest Genesis Gateway</p>
                    <p className="text-xs text-cyan-200/80">{DOGECORD_ACCESS_PASS.name}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-200 backdrop-blur-xl">
                  <Radio className="h-4 w-4" />
                  Contract mint ready
                </div>
              </div>

              <div className="max-w-5xl py-10">
                <div className="mb-7 grid h-28 w-28 place-items-center overflow-hidden rounded-[30px] border border-cyan-300/30 bg-white/[0.06] shadow-[0_30px_90px_rgba(34,211,238,0.26)] backdrop-blur-xl">
                  <Image src="/arc-nest.png" alt="ArcNest logo" width={104} height={104} className="h-24 w-24 object-contain" priority />
                </div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur-xl">
                  <Sparkles className="h-4 w-4" />
                  Mint the key. Enter the signal.
                </p>
                <h1 className="max-w-5xl text-[clamp(2.5rem,4vw,4.4rem)] font-black leading-[0.96] tracking-[0] text-white">
                  ArcNest opens the door to Arc House.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">
                  A wallet-bound access gateway for builders, holders, and realtime communities on Arc Testnet. Sign once, sync the contract, then step into the nest.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/12 bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-cyan-300/10 text-cyan-100">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-black text-white">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-white/12 bg-[#0B101C]/82 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.58),0_0_70px_rgba(16,185,129,0.12)] backdrop-blur-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-black">Enter the Nest</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Match the active wallet to your session, then mint or sync your access pass.
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-cyan-300/10 text-cyan-200">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-black/22 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Wallet</span>
              <span className="max-w-[190px] truncate font-black">{shortAddress(address)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Session</span>
              <span className="max-w-[190px] truncate font-black">{session ? shortAddress(session.wallet.address) : "Not signed"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Access</span>
              <span className={statusClassName}>{status}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Price</span>
              <span className="font-black">{DOGECORD_ACCESS_PASS.priceUsdc} USDC</span>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-white/14 bg-black/20 p-4">
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>

          {walletMismatch && (
            <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
              Your browser session belongs to {shortAddress(session?.wallet.address)}, but MetaMask is on {shortAddress(address)}. Sign again to use this wallet.
            </p>
          )}

          {primaryAction()}

          {sessionMatchesWallet && !passState?.hasPass && hasContract && (
            <button type="button" className="mt-3 w-full text-xs font-bold text-zinc-400 transition hover:text-white disabled:opacity-60" disabled={isSyncing} onClick={syncExistingPass}>
              {isSyncing ? "Syncing pass..." : "Already minted? Sync from contract"}
            </button>
          )}

          <div className="mt-4 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Need Arc Testnet USDC?</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Use Circle faucet for test funds before minting the {DOGECORD_ACCESS_PASS.name}.
                </p>
                <a
                  href={CIRCLE_FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-300/20 bg-black/20 px-3 text-xs font-black text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                >
                  Open Circle faucet
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-200">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-[11px] leading-5 text-zinc-400">
            Signing is gasless. Minting starts only after the session wallet matches MetaMask.
          </p>
        </section>
      </div>
    </main>
  );
};
