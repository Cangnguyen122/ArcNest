"use client";

import { Member, MemberRole, Profile, Server } from "@prisma/client";
import { Crown, MessageCircle, MoreVertical, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { isProfileOnline } from "@/lib/presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ServerMemberProps {
  member: Member & { profile: Profile };
  server: Server;
}

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MEMBER]: null,
  [MemberRole.MODERATOR]: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  [MemberRole.ADMIN]: <Crown className="h-4 w-4 ml-2 text-amber-400" />
}

export const ServerMember = ({
  member,
  server
}: ServerMemberProps) => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const icon = roleIconMap[member.role];
  const isOnline = isProfileOnline(member.profile.lastSeenAt);

  const onClick = () => {
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`)
  }

  const runSocialAction = async (action: "request" | "block") => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/social/relationships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetProfileId: member.profileId,
          action,
        }),
      });

      if (!response.ok) {
        console.log(await response.text());
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.memberId === member.id && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-x-2 text-left">
        <UserAvatar 
          src={member.profile.imageUrl}
          className="h-8 w-8 md:h-8 md:w-8"
          showStatus
          isOnline={isOnline}
        />
        <p
          className={cn(
            "truncate font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
            params?.memberId === member.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white"
          )}
        >
          {member.profile.name}
        </p>
        {icon}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isLoading}
            className="ml-auto rounded-md p-1 text-zinc-500 opacity-0 transition hover:bg-zinc-700/20 hover:text-zinc-700 group-hover:opacity-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-44">
          <DropdownMenuItem onClick={onClick} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => runSocialAction("request")} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add friend
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => runSocialAction("block")}
            className="gap-2 text-rose-500 focus:text-rose-500"
          >
            <UserX className="h-4 w-4" />
            Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
