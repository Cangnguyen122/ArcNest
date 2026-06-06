import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Member, Message, Profile } from "@prisma/client";

import { useSocket } from "@/components/providers/socket-provider";

type ChatSocketProps = {
  chatId: string;
  type: "channel" | "conversation";
  addKey: string;
  updateKey: string;
  queryKey: string;
}

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  }
}

export const useChatSocket = ({
  chatId,
  type,
  addKey,
  updateKey,
  queryKey
}: ChatSocketProps) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [isRoomLive, setIsRoomLive] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) {
      setIsRoomLive(false);
      return;
    }

    let isActive = true;
    setIsRoomLive(false);

    const joinRoom = async () => {
      try {
        const response = await fetch(`/api/socket-token?chatId=${encodeURIComponent(chatId)}&type=${type}`);

        if (!response.ok) {
          return;
        }

        const { token } = await response.json();

        if (!isActive) {
          return;
        }

        socket.timeout(5000).emit("chat:join", { chatId, token }, (error: Error | null, result?: { ok: boolean }) => {
          if (!isActive) {
            return;
          }

          setIsRoomLive(!error && !!result?.ok);
        });
      } catch (error) {
        console.log(error);
      }
    };

    joinRoom();

    socket.on(updateKey, (message: MessageWithMemberWithProfile) => {
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        const newData = oldData.pages.map((page: any) => {
          return {
            ...page,
            items: page.items.map((item: MessageWithMemberWithProfile) => {
              if (item.id === message.id) {
                return message;
              }
              return item;
            })
          }
        });

        return {
          ...oldData,
          pages: newData,
        }
      })
    });

    socket.on(addKey, (message: MessageWithMemberWithProfile) => {
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [{
              items: [message],
            }]
          }
        }

        const newData = [...oldData.pages];

        newData[0] = {
          ...newData[0],
          items: [
            message,
            ...newData[0].items,
          ]
        };

        return {
          ...oldData,
          pages: newData,
        };
      });
    });

    return () => {
      isActive = false;
      setIsRoomLive(false);
      socket.emit("chat:leave", { chatId });
      socket.off(addKey);
      socket.off(updateKey);
    }
  }, [queryClient, addKey, chatId, isConnected, queryKey, socket, type, updateKey]);

  return {
    isRoomLive,
  };
}
