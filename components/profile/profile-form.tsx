"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, Save, ShieldCheck, User, Wallet, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { AvatarCropUpload } from "@/components/profile/avatar-crop-upload";
import { FileUpload } from "@/components/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/brand";

const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(32, "Display name is too long")
    .refine((value) => !walletAddressRegex.test(value), "Use a real display name, not your wallet address"),
  imageUrl: z.string().optional(),
  bio: z.string().trim().max(160, "Bio is too long").optional(),
});

interface ProfileFormProps {
  initialData: {
    name: string;
    imageUrl: string;
    bio?: string | null;
    walletAddress?: string | null;
  };
}

const shortenAddress = (address?: string | null) => {
  if (!address) return "No wallet";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const normalizeDisplayName = (name?: string | null, walletAddress?: string | null) => {
  const value = name?.trim() || "";

  if (!value) return "";
  if (walletAddress && value.toLowerCase() === walletAddress.toLowerCase()) return "";
  if (walletAddressRegex.test(value)) return "";

  return value;
};

export const ProfileForm = ({ initialData }: ProfileFormProps) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData.imageUrl || "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  };

  const defaultDisplayName = useMemo(
    () => normalizeDisplayName(initialData.name, initialData.walletAddress),
    [initialData.name, initialData.walletAddress],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultDisplayName,
      imageUrl: initialData.imageUrl || "",
      bio: initialData.bio || "",
    },
  });

  const isLoading = form.formState.isSubmitting;
  const bioValue = form.watch("bio") || "";
  const imageUrl = avatarPreview || form.watch("imageUrl") || "";
  const nameValue = form.watch("name")?.trim() || "Choose your name";
  const previewInitial = (nameValue || "D").slice(0, 1).toUpperCase();
  const previewWallet = shortenAddress(initialData.walletAddress);

  const copyWalletAddress = async () => {
    if (!initialData.walletAddress) return;

    await navigator.clipboard.writeText(initialData.walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
  try {
      await axios.patch("/api/profile", {
        name: values.name,
        imageUrl: values.imageUrl || "",
        bio: values.bio || "",
      });

      showToast("success", "Profile saved successfully");
      router.refresh();
    } catch (error) {
      console.log(error);
      showToast("error", "Could not save profile");
    }
  };

  return (
    <Form {...form}>
      {toast && (
        <div className="fixed right-5 top-5 z-[9999] animate-in fade-in slide-in-from-top-2">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-100"
                : "border-rose-400/25 bg-rose-500/15 text-rose-100"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4 text-emerald-300" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-300" />
            )}
            {toast.message}
          </div>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {saveMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200 shadow-[0_14px_36px_rgba(16,185,129,0.12)]">
            <Check className="h-4 w-4 shrink-0 text-emerald-300" />
            {saveMessage}
          </div>
        )}

        {saveError && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200 shadow-[0_14px_36px_rgba(244,63,94,0.12)]">
            {saveError}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="self-stretch overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="h-20 bg-[radial-gradient(circle_at_18%_20%,rgba(124,134,255,0.95),transparent_34%),linear-gradient(135deg,rgba(88,101,242,0.96),rgba(35,165,89,0.5))]" />

            <div className="px-5 pb-5">
              <div className="-mt-10 mb-5 flex items-end justify-between gap-3">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[22px] border-4 border-[#0D111A] bg-[#5865F2] text-3xl font-black text-white shadow-[0_20px_52px_rgba(88,101,242,0.32)]">
                  {imageUrl ? (
                    <img src={imageUrl} alt={nameValue} className="h-full w-full object-cover" />
                  ) : (
                    previewInitial
                  )}
                </div>

                <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <h2 className="min-w-0 truncate text-2xl font-black tracking-tight text-white">
                  {nameValue}
                </h2>

                <div className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                  <span className="font-mono">{previewWallet}</span>
                </div>
              </div>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
                {bioValue || "Add a short bio so Arc communities know who you are."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-[10px] text-zinc-500">Profile</p>
                  <p className="mt-1 text-xs font-black text-white">Public</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-[10px] text-zinc-500">Network</p>
                  <p className="mt-1 text-xs font-black text-emerald-300">Arc Testnet</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    <User className="h-4 w-4 text-[#AAB4FF]" />
                    Profile details
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    This is your public identity across {APP_NAME} spaces.
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                  Editable
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[132px_minmax(0,1fr)] md:items-start">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="md:max-w-[128px]">
                      <FormLabel className="text-xs font-black uppercase tracking-wide text-zinc-400">
                        Avatar
                      </FormLabel>
                      <FormControl>
                        <AvatarCropUpload
                          value={imageUrl}
                          disabled={isLoading}
                          onChange={(url) => {
                            const nextUrl = url || "";

                            setAvatarPreview(nextUrl);
                            field.onChange(nextUrl);

                            form.setValue("imageUrl", nextUrl, {
                              shouldDirty: true,
                              shouldValidate: true,
                              shouldTouch: true,
                            });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-black text-zinc-200">{APP_NAME} name</FormLabel>
                        <FormControl>
                          <Input
                            disabled={isLoading}
                            className="h-11 border-white/10 bg-black/25 px-4 text-sm font-bold text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-[#5865F2] focus-visible:ring-offset-0"
                            placeholder="Choose a public name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-3">
                          <FormLabel className="text-sm font-black text-zinc-200">Bio</FormLabel>
                          <span className="text-xs text-zinc-500">{bioValue.length}/160</span>
                        </div>
                        <FormControl>
                          <textarea
                            disabled={isLoading}
                            className="min-h-[86px] w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-[#5865F2]"
                            placeholder="What are you building, collecting, or exploring on Arc?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[26px] border border-white/10 bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-sm font-black text-white">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  Read-only wallet
                </div>
                <p className="text-xs leading-5 text-zinc-500">
                  This address verifies your account. It cannot be changed from profile settings.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                disabled={!initialData.walletAddress}
                onClick={copyWalletAddress}
                className="shrink-0 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : shortenAddress(initialData.walletAddress)}
              </Button>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-zinc-500">
            Only public profile fields are saved. Wallet identity stays unchanged.
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="h-11 gap-2 rounded-2xl bg-[#5865F2] px-5 font-black shadow-[0_16px_38px_rgba(88,101,242,0.3)] hover:bg-[#4752C4]"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
        </div>
      </form>
    </Form>
  );
};
