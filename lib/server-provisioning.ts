import { ChannelType, MemberRole } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/lib/db";

type ProfileForProvisioning = {
  id: string;
  name: string;
  primaryWalletAddress?: string | null;
  primaryWalletAddressLower?: string | null;
};

export const ARC_HOUSE_NAME = "Arc House";
export const ARC_HOUSE_IMAGE_URL = "/vercel.svg";
export const PERSONAL_SERVER_IMAGE_URL = "/arc-nest.png";

const shortAddress = (address?: string | null) => {
  if (!address) {
    return "member";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ensureMembership = async ({
  serverId,
  profileId,
  role = MemberRole.MEMBER,
}: {
  serverId: string;
  profileId: string;
  role?: MemberRole;
}) => {
  const member = await db.member.findFirst({
    where: {
      serverId,
      profileId,
    },
  });

  if (member) {
    return member;
  }

  return db.member.create({
    data: {
      serverId,
      profileId,
      role,
    },
  });
};

const ensureChannel = async ({
  serverId,
  profileId,
  name,
  type,
}: {
  serverId: string;
  profileId: string;
  name: string;
  type: ChannelType;
}) => {
  const channel = await db.channel.findFirst({
    where: {
      serverId,
      name,
      type,
    },
  });

  if (channel) {
    return channel;
  }

  return db.channel.create({
    data: {
      serverId,
      profileId,
      name,
      type,
    },
  });
};

export const ensureArcHouseForProfile = async (profile: ProfileForProvisioning) => {
  const existingArcHouse = await db.server.findFirst({
    where: {
      name: ARC_HOUSE_NAME,
    },
    include: {
      channels: true,
    },
  });

  const arcHouse = existingArcHouse || await db.server.create({
    data: {
      profileId: profile.id,
      name: ARC_HOUSE_NAME,
      imageUrl: ARC_HOUSE_IMAGE_URL,
      inviteCode: uuidv4(),
      channels: {
        create: [
          { name: "welcome", type: ChannelType.TEXT, profileId: profile.id },
          { name: "general", type: ChannelType.TEXT, profileId: profile.id },
          { name: "nft-holders", type: ChannelType.TEXT, profileId: profile.id },
          { name: "lounge", type: ChannelType.AUDIO, profileId: profile.id },
          { name: "video-room", type: ChannelType.VIDEO, profileId: profile.id },
        ],
      },
      members: {
        create: [
          { profileId: profile.id, role: MemberRole.ADMIN },
        ],
      },
    },
  });

  await ensureMembership({
    serverId: arcHouse.id,
    profileId: profile.id,
    role: arcHouse.profileId === profile.id ? MemberRole.ADMIN : MemberRole.MEMBER,
  });

  await Promise.all([
    ensureChannel({ serverId: arcHouse.id, profileId: arcHouse.profileId, name: "welcome", type: ChannelType.TEXT }),
    ensureChannel({ serverId: arcHouse.id, profileId: arcHouse.profileId, name: "general", type: ChannelType.TEXT }),
    ensureChannel({ serverId: arcHouse.id, profileId: arcHouse.profileId, name: "nft-holders", type: ChannelType.TEXT }),
    ensureChannel({ serverId: arcHouse.id, profileId: arcHouse.profileId, name: "lounge", type: ChannelType.AUDIO }),
    ensureChannel({ serverId: arcHouse.id, profileId: arcHouse.profileId, name: "video-room", type: ChannelType.VIDEO }),
  ]);

  return arcHouse;
};

export const ensurePersonalPassServerForProfile = async (profile: ProfileForProvisioning) => {
  const ownerTag = shortAddress(profile.primaryWalletAddress || profile.primaryWalletAddressLower);
  const serverName = `${ownerTag}'s Arc Room`;
  const existingServer = await db.server.findFirst({
    where: {
      profileId: profile.id,
      name: serverName,
    },
  });

  if (existingServer) {
    await Promise.all([
      ensureChannel({ serverId: existingServer.id, profileId: profile.id, name: "general", type: ChannelType.TEXT }),
      ensureChannel({ serverId: existingServer.id, profileId: profile.id, name: "announcements", type: ChannelType.TEXT }),
      ensureChannel({ serverId: existingServer.id, profileId: profile.id, name: "voice", type: ChannelType.AUDIO }),
      ensureChannel({ serverId: existingServer.id, profileId: profile.id, name: "video-room", type: ChannelType.VIDEO }),
    ]);

    return existingServer;
  }

  return db.server.create({
    data: {
      profileId: profile.id,
      name: serverName,
      imageUrl: PERSONAL_SERVER_IMAGE_URL,
      inviteCode: uuidv4(),
      channels: {
        create: [
          { name: "general", type: ChannelType.TEXT, profileId: profile.id },
          { name: "announcements", type: ChannelType.TEXT, profileId: profile.id },
          { name: "voice", type: ChannelType.AUDIO, profileId: profile.id },
          { name: "video-room", type: ChannelType.VIDEO, profileId: profile.id },
        ],
      },
      members: {
        create: [
          { profileId: profile.id, role: MemberRole.ADMIN },
        ],
      },
    },
  });
};

export const ensureCoreServersForPassHolder = async (profile: ProfileForProvisioning) => {
  const arcHouse = await ensureArcHouseForProfile(profile);
  const personalServer = await ensurePersonalPassServerForProfile(profile);

  return {
    arcHouse,
    personalServer,
  };
};
