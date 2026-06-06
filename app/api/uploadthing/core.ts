import { createUploadthing, type FileRouter } from "uploadthing/next";

import { currentProfile } from "@/lib/current-profile";
 
const f = createUploadthing();
 
const handleAuth = async () => {
  const profile = await currentProfile();
  if (!profile) throw new Error("Unauthorized");
  return { profileId: profile.id };
}

export const ourFileRouter = {
  profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
  serverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
  messageFile: f(["image", "pdf"])
    .middleware(() => handleAuth())
    .onUploadComplete(() => {})
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
