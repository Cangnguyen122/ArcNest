"use client";

import Image from "next/image";

import { ActionTooltip } from "@/components/action-tooltip";

export const NavigationShop = () => {
  return (
    <ActionTooltip
      side="right"
      align="center"
      label="Market coming soon"
    >
      <button
        type="button"
        aria-label="Market coming soon"
        className="group relative flex items-center"
      >
        <div className="absolute left-0 h-[8px] w-[4px] rounded-r-full bg-primary transition-all group-hover:h-[20px]" />
        <div className="mx-3 flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-[24px] bg-zinc-200 transition-all group-hover:rounded-[16px] dark:bg-neutral-700">
          <Image
            src="/arcnest-shop.svg"
            alt="ArcNest market"
            width={48}
            height={48}
            priority
          />
        </div>
      </button>
    </ActionTooltip>
  );
};
