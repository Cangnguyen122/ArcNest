import { NextResponse } from "next/server";

import { APP_NAME } from "@/lib/brand";

const metadataByRole = {
  member: {
    name: `${APP_NAME} Arc Pass - Member`,
    description: `Member access pass for ${APP_NAME} Arc House, personal servers, NFT-gated invites, and future holder utilities.`,
    image: "/nft/images/dogecord-member.png",
    role: "Member",
    access: "Holder",
  },
  admin: {
    name: `${APP_NAME} Arc Pass - Admin`,
    description: `Admin access pass for ${APP_NAME} Arc House, elevated platform privileges, community operations, and future holder utilities.`,
    image: "/nft/images/dogecord-admin.png",
    role: "Admin",
    access: "Platform Admin",
  },
  owner: {
    name: `${APP_NAME} Arc Pass - Owner`,
    description: `Owner access pass for ${APP_NAME} Arc House, founder-level platform authority, and future holder utilities.`,
    image: "/nft/images/dogecord-owner.png",
    role: "Owner",
    access: "Platform Owner",
  },
} as const;

export async function GET(req: Request, { params }: { params: { role: string } }) {
  const role = params.role.toLowerCase() as keyof typeof metadataByRole;
  const metadata = metadataByRole[role];

  if (!metadata) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const origin = new URL(req.url).origin;

  return NextResponse.json({
    name: metadata.name,
    description: metadata.description,
    image: `${origin}${metadata.image}`,
    attributes: [
      { trait_type: "Platform", value: APP_NAME },
      { trait_type: "House", value: "Arc House" },
      { trait_type: "Role", value: metadata.role },
      { trait_type: "Access", value: metadata.access },
    ],
  });
}
