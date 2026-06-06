import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string;
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
};

export const UserAvatar = ({
  src,
  className,
  showStatus = false,
  isOnline = false,
}: UserAvatarProps) => {
  return (
    <div className={cn("relative h-7 w-7 shrink-0 md:h-10 md:w-10", className)}>
      <Avatar className="h-full w-full">
        <AvatarImage src={src} />
        <AvatarFallback className="bg-indigo-500 text-xs font-semibold text-white">
          W3
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#2B2D31]",
            isOnline
              ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              : "bg-zinc-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          )}
        />
      )}
    </div>
  )
}
