import { redirect } from "next/navigation";
import { ChannelType } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";
import { ServerChatShell } from "@/components/server/server-chat-shell";
import { db } from "@/lib/db";

interface ChannelIdPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
  searchParams: {
    video?: string;
  };
}

const ChannelIdPage = async ({
  params,
  searchParams,
}: ChannelIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const channel = await db.channel.findUnique({
    where: {
      id: params.channelId,
    },
  });

  const member = await db.member.findFirst({
    where: {
      serverId: params.serverId,
      profileId: profile.id,
    }
  });

  if (!channel || !member) {
    redirect("/");
  }

  return (
    <ServerChatShell serverId={params.serverId}>
      <div className="flex h-full min-w-0 flex-col overflow-hidden bg-white dark:bg-[#313338]">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
        apiUrl="/api/messages"
        paramKey="channelId"
        paramValue={channel.id}
      />
      {channel.type === ChannelType.TEXT && searchParams.video && (
        <MediaRoom
          chatId={channel.id}
          video={true}
          audio={true}
        />
      )}
      {channel.type === ChannelType.TEXT && !searchParams.video && (
        <>
          <ChatMessages
            member={member}
            name={channel.name}
            chatId={channel.id}
            type="channel"
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            paramKey="channelId"
            paramValue={channel.id}
          />
          <ChatInput
            chatId={channel.id}
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
          />
        </>
      )}
      {channel.type === ChannelType.AUDIO && (
        <MediaRoom
          chatId={channel.id}
          video={false}
          audio={true}
        />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom
          chatId={channel.id}
          video={true}
          audio={true}
        />
      )}
      </div>
    </ServerChatShell>
   );
}
 
export default ChannelIdPage;
