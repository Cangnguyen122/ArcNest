import { db } from "@/lib/db";
import { getInitialMessageRequestStatus } from "@/lib/social";

export const getOrCreateConversation = async (memberOneId: string, memberTwoId: string) => {
  let conversation = await findConversation(memberOneId, memberTwoId) || await findConversation(memberTwoId, memberOneId);

  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }

  return conversation;
}

const findConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    return await db.conversation.findFirst({
      where: {
        AND: [
          { memberOneId: memberOneId },
          { memberTwoId: memberTwoId },
        ]
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          }
        },
        memberTwo: {
          include: {
            profile: true,
          }
        }
      }
    });
  } catch {
    return null;
  }
}

const createNewConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    const [memberOne, memberTwo] = await Promise.all([
      db.member.findUnique({
        where: {
          id: memberOneId,
        },
        select: {
          profileId: true,
        },
      }),
      db.member.findUnique({
        where: {
          id: memberTwoId,
        },
        select: {
          profileId: true,
        },
      }),
    ]);

    if (!memberOne || !memberTwo) {
      return null;
    }

    const messageRequestStatus = await getInitialMessageRequestStatus(memberOne.profileId, memberTwo.profileId);

    return await db.conversation.create({
      data: {
        memberOneId,
        memberTwoId,
        messageRequestStatus,
        requestedByProfileId: messageRequestStatus === "PENDING" ? memberOne.profileId : null,
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          }
        },
        memberTwo: {
          include: {
            profile: true,
          }
        }
      }
    })
  } catch {
    return null;
  }
}
