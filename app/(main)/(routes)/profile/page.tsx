import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessPassNftCard } from "@/components/profile/access-pass-nft-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { getActiveAccessPassForProfile, syncContractAccessPassForProfile } from "@/lib/access-pass";
import { APP_NAME } from "@/lib/brand";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";

const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const shortenAddress = (address?: string | null) => {
  if (!address) return "No wallet";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getSafeDisplayName = (name?: string | null, walletAddress?: string | null) => {
  const value = name?.trim() || "";

  if (!value) return "";
  if (walletAddress && value.toLowerCase() === walletAddress.toLowerCase()) return "";
  if (walletAddressRegex.test(value)) return "";

  return value;
};

const ProfilePage = async () => {
  const sessionProfile = await currentProfile();

  if (!sessionProfile) {
    return redirect("/sign-in");
  }

  const profile = await db.profile.findUnique({
    where: {
      id: sessionProfile.id,
    },
  });

  if (!profile) {
    return redirect("/sign-in");
  }

  const firstServer = await db.server.findFirst({
    where: {
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const walletAddress = profile.primaryWalletAddress;
  const displayName = getSafeDisplayName(profile.name, walletAddress);
  const backHref = firstServer ? `/servers/${firstServer.id}` : "/";
  const accessPass = DOGECORD_ACCESS_PASS.contractAddress
    ? await syncContractAccessPassForProfile(profile)
    : await getActiveAccessPassForProfile(profile.id);
  const tokenBaseUri =
    process.env.ACCESS_PASS_TOKEN_BASE_URI ||
    process.env.ACCESS_PASS_TOKEN_URI ||
    "";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#05070D] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(88,101,242,0.24),transparent_31%),radial-gradient(circle_at_82%_24%,rgba(35,165,89,0.18),transparent_30%),radial-gradient(circle_at_50%_92%,rgba(14,165,233,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:54px_54px] opacity-55" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/[0.055] to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5865F2]/10 blur-[130px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col justify-center px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 flex w-full items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
          >
            <span className="text-base leading-none">{"<"}</span>
            Back to server
          </Link>

          <div className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
            <span className="mr-2 hidden text-zinc-500 sm:inline">Wallet</span>
            <span className="font-mono font-black text-zinc-100">{shortenAddress(walletAddress)}</span>
          </div>
        </div>

<div className="grid w-full items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
  <section className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0B1018]/88 shadow-[0_30px_110px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
    <div className="border-b border-white/10 px-5 py-6 md:px-8 md:py-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center rounded-full border border-[#5865F2]/25 bg-[#5865F2]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB4FF]">
            Public identity
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            Shape your {APP_NAME} profile.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Create a public name, avatar, and bio for Arc spaces. Your wallet remains verified and read-only.
          </p>
        </div>
      </div>
    </div>

    <div className="p-5 md:p-6">
      <ProfileForm
        initialData={{
          name: displayName,
          imageUrl: profile.imageUrl || "",
          bio: profile.bio,
          walletAddress,
        }}
      />
    </div>
  </section>

  <div className="xl:sticky xl:top-6">
    <AccessPassNftCard
      pass={accessPass}
      walletAddress={walletAddress}
      tokenBaseUri={tokenBaseUri}
    />
  </div>
</div>
      </div>
    </main>
  );
};

export default ProfilePage;
