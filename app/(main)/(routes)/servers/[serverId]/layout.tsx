import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { hasActivePrivateRoomAccess } from "@/lib/arcnest-pay";
const ServerIdLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { serverId: string };
}) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const server = await db.server.findUnique({
    where: {
      id: params.serverId,
      members: {
        some: {
          profileId: profile.id
        }
      }
    }
  });

  if (!server) {
    return redirect("/");
  }

  const canEnterServer = await hasActivePrivateRoomAccess(params.serverId, profile.id);

  if (!canEnterServer) {
    return redirect("/");
  }

  return ( 
    <>{children}</>
   );
}
 
export default ServerIdLayout;
