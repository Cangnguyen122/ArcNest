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
  messageFile: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    video: { maxFileSize: "64MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    blob: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {})
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
