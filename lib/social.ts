import { MessageRequestStatus, SocialRelationshipStatus } from "@prisma/client";

import { db } from "@/lib/db";

export const findSocialRelationshipBetweenProfiles = async (
  profileOneId: string,
  profileTwoId: string,
) => {
  return db.socialRelationship.findFirst({
    where: {
      OR: [
        {
          requesterProfileId: profileOneId,
          addresseeProfileId: profileTwoId,
        },
        {
          requesterProfileId: profileTwoId,
          addresseeProfileId: profileOneId,
        },
      ],
    },
  });
};

export const areProfilesBlocked = async (profileOneId: string, profileTwoId: string) => {
  const relationship = await findSocialRelationshipBetweenProfiles(profileOneId, profileTwoId);

  return relationship?.status === SocialRelationshipStatus.BLOCKED;
};

export const areProfilesFriends = async (profileOneId: string, profileTwoId: string) => {
  const relationship = await findSocialRelationshipBetweenProfiles(profileOneId, profileTwoId);

  return relationship?.status === SocialRelationshipStatus.ACCEPTED;
};

export const getInitialMessageRequestStatus = async (
  requesterProfileId: string,
  recipientProfileId: string,
) => {
  if (await areProfilesFriends(requesterProfileId, recipientProfileId)) {
    return MessageRequestStatus.ACCEPTED;
  }

  return MessageRequestStatus.PENDING;
};
