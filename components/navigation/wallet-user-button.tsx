"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDisconnect } from "wagmi";

import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletUserButtonProps {
  name: string;
  imageUrl: string;
}

export const WalletUserButton = ({
  name,
  imageUrl,
}: WalletUserButtonProps) => {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);

    try {
      await fetch("/api/auth/wallet/logout", {
        method: "POST",
      });
      disconnect();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <ActionTooltip label={name} side="right">
        <DropdownMenuTrigger
          disabled={isLoading}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 transition hover:rounded-2xl disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-700"
        >
          <UserAvatar src={imageUrl} className="h-12 w-12 md:h-12 md:w-12" showStatus isOnline />
        </DropdownMenuTrigger>
      </ActionTooltip>
      <DropdownMenuContent
        side="right"
        align="end"
        className="w-52 text-xs font-medium text-black dark:text-neutral-400"
      >
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="cursor-pointer px-3 py-2 text-sm"
        >
          Edit Profile
          <User className="ml-auto h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer px-3 py-2 text-sm text-rose-500"
        >
          Sign out
          <LogOut className="ml-auto h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
