import { redirect } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile"
import { db } from "@/lib/db";
import { getActiveAccessPassForProfile } from "@/lib/access-pass";
import { ARC_HOUSE_NAME, ensureCoreServersForPassHolder } from "@/lib/server-provisioning";

import { NavigationAction } from "./navigation-action";
import { NavigationItem } from "./navigation-item";
import { NavigationShop } from "./navigation-shop";
import { WalletUserButton } from "./wallet-user-button";

export const NavigationSidebar = async () => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  const activePass = await getActiveAccessPassForProfile(profile.id);

  if (activePass) {
    await ensureCoreServersForPassHolder(profile);
  }

  const servers = await db.server.findMany({
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

  const sortedServers = [...servers].sort((first, second) => {
    if (first.name === ARC_HOUSE_NAME) return -1;
    if (second.name === ARC_HOUSE_NAME) return 1;

    if (first.profileId === profile.id && second.profileId !== profile.id) return -1;
    if (second.profileId === profile.id && first.profileId !== profile.id) return 1;

    return first.createdAt.getTime() - second.createdAt.getTime();
  });

  return (
    <div
      className="space-y-4 flex h-full w-full min-w-0 flex-col items-center overflow-hidden text-primary dark:bg-[#1E1F22] bg-[#E3E5E8] py-3"
    >
      <NavigationAction canCreateServer={!!activePass} />
      <NavigationShop />
      <Separator
        className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto"
      />
      <ScrollArea className="min-h-0 flex-1 w-full">
        {sortedServers.map((server) => (
          <div key={server.id} className="mb-4">
            <NavigationItem
              id={server.id}
              name={server.name}
              imageUrl={server.imageUrl}
            />
          </div>
        ))}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        <WalletUserButton name={profile.name} imageUrl={profile.imageUrl} />
      </div>
    </div>
  )
}
