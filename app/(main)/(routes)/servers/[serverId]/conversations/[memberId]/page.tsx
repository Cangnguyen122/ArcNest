import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getOrCreateConversation } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageRequestBanner } from "@/components/chat/message-request-banner";
import { MediaRoom } from "@/components/media-room";
import { ServerChatShell } from "@/components/server/server-chat-shell";
import { isProfileOnline } from "@/lib/presence";
import { DmPaySidebar } from "@/components/pay/dm-pay-sidebar";

interface MemberIdPageProps {
  params: {
    memberId: string;
    serverId: string;
  },
  searchParams: {
    video?: boolean;
  }
}

const MemberIdPage = async ({
  params,
  searchParams,
}: MemberIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const currentMember = await db.member.findFirst({
    where: {
      serverId: params.serverId,
      profileId: profile.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentMember) {
    return redirect("/");
  }

  const conversation = await getOrCreateConversation(currentMember.id, params.memberId);

  if (!conversation) {
    return redirect(`/servers/${params.serverId}`);
  }

  const { memberOne, memberTwo } = conversation;

  const otherMember = memberOne.profileId === profile.id ? memberTwo : memberOne;
  const isPendingRequest = conversation.messageRequestStatus === "PENDING";
  const isIgnoredRequest = conversation.messageRequestStatus === "IGNORED";
  const isRequestRecipient = isPendingRequest && conversation.requestedByProfileId !== profile.id;
  const canSendMessage = !isIgnoredRequest && (!isPendingRequest || conversation.requestedByProfileId === profile.id);
  const isOtherMemberOnline = isProfileOnline(otherMember.profile.lastSeenAt);

  return (
    <ServerChatShell serverId={params.serverId}>
      <div className="flex h-full min-w-0 overflow-hidden">
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#313338]">
        <ChatHeader
          imageUrl={otherMember.profile.imageUrl}
          name={otherMember.profile.name}
          serverId={params.serverId}
          type="conversation"
          isOnline={isOtherMemberOnline}
        />
        {searchParams.video && (
          <MediaRoom
            chatId={conversation.id}
            video={true}
            audio={true}
          />
        )}
        {!searchParams.video && (
          <>
            {isPendingRequest && (
              <MessageRequestBanner
                conversationId={conversation.id}
                isRecipient={isRequestRecipient}
                name={otherMember.profile.name}
              />
            )}
            <ChatMessages
              member={currentMember}
              name={otherMember.profile.name}
              chatId={conversation.id}
              type="conversation"
              apiUrl="/api/direct-messages"
              paramKey="conversationId"
              paramValue={conversation.id}
              socketUrl="/api/socket/direct-messages"
              socketQuery={{
                conversationId: conversation.id,
              }}
            />
            {canSendMessage && (
              <ChatInput
                chatId={conversation.id}
                name={otherMember.profile.name}
                type="conversation"
                apiUrl="/api/socket/direct-messages"
                query={{
                  conversationId: conversation.id,
                }}
              />
            )}
            {!canSendMessage && (
              <div className="shrink-0 border-t border-zinc-200 px-4 py-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {isIgnoredRequest
                  ? "This message request was ignored."
                  : "Accept this message request before replying."}
              </div>
            )}
          </>
        )}
        </div>
        {!searchParams.video && (
          <DmPaySidebar
            conversationId={conversation.id}
            recipientProfileId={otherMember.profileId}
            name={otherMember.profile.name}
            bio={otherMember.profile.bio}
            imageUrl={otherMember.profile.imageUrl}
            walletAddress={otherMember.profile.primaryWalletAddress || otherMember.profile.primaryWalletAddressLower}
          />
        )}
      </div>
    </ServerChatShell>
   );
}
 
export default MemberIdPage;
