import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { ServerSidebar } from "@/components/server/server-sidebar";

interface ServerChatShellProps {
  serverId: string;
  children: React.ReactNode;
}

export const ServerChatShell = ({
  serverId,
  children,
}: ServerChatShellProps) => {
  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-white dark:bg-[#313338]">
      <aside className="flex h-screen w-[72px] shrink-0 flex-col bg-[#E3E5E8] dark:bg-[#1E1F22]">
        <NavigationSidebar />
      </aside>
      <aside className="flex h-screen w-60 shrink-0 flex-col bg-[#F2F3F5] dark:bg-[#2B2D31]">
        <ServerSidebar serverId={serverId} />
      </aside>
      <main className="h-screen min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
};
