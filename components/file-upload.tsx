"use client";

import { FileIcon, X } from "lucide-react";
import Image from "next/image";

import { UploadButton, UploadDropzone } from "@/lib/uploadthing";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "profileImage" | "serverImage";
}

const getUploadedUrl = (file: any) => {
  return (
    file?.url ||
    file?.ufsUrl ||
    file?.appUrl ||
    file?.fileUrl ||
    file?.serverData?.url ||
    ""
  );
};

const getFileType = (url?: string) => {
  if (!url) return "";

  const cleanUrl = url.split("?")[0];
  return cleanUrl.split(".").pop()?.toLowerCase() || "";
};

const isImageFile = (fileType: string) => {
  return ["png", "jpg", "jpeg", "webp", "avif"].includes(fileType);
};

const isVideoFile = (fileType: string) => {
  return ["mp4", "mov", "webm", "m4v"].includes(fileType);
};

export const FileUpload = ({
  onChange,
  value,
  endpoint,
}: FileUploadProps) => {
  const fileType = getFileType(value);

  if (value && isImageFile(fileType)) {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/15 bg-black/30 shadow-[0_16px_38px_rgba(0,0,0,0.35)]">
      <Image
        fill
        src={value}
        alt="Upload"
        className="rounded-full object-cover"
        sizes="80px"
      />

      <button
        onClick={() => onChange("")}
        className="absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow-sm transition hover:bg-rose-400"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

  if (value && isVideoFile(fileType)) {
    return (
      <div className="relative mt-2 overflow-hidden rounded-md border bg-black">
        <video
          src={value}
          controls
          className="h-40 w-64 object-cover"
        />

        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-2 rounded-full bg-rose-500 p-1 text-white shadow-sm transition hover:bg-rose-400"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (value) {
    return (
      <div className="relative mt-2 flex items-center rounded-md bg-background/10 p-2">
        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />

        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 max-w-[220px] truncate text-sm text-indigo-500 hover:underline dark:text-indigo-400"
        >
          {value}
        </a>

        <button
          onClick={() => onChange("")}
          className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white shadow-sm transition hover:bg-rose-400"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (endpoint === "profileImage") {
    return (
      <div className="flex h-[112px] w-[128px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-black/20 px-3 text-center">
        <UploadButton
          endpoint="profileImage"
          onClientUploadComplete={(res) => {
            console.log("UploadThing profile response:", res);

            const uploadedUrl = getUploadedUrl(res?.[0]);

            if (!uploadedUrl) {
              console.error("Upload completed but no URL was returned:", res);
              return;
            }

            onChange(uploadedUrl);
          }}
          onUploadError={(error: Error) => {
            console.error("Upload error:", error);
          }}
        />

        <p className="mt-2 text-[11px] text-zinc-500">
          Image up to 4MB
        </p>
      </div>
    );
  }

  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={(res) => {
        console.log("UploadThing response:", res);

        const uploadedUrl = getUploadedUrl(res?.[0]);

        if (!uploadedUrl) {
          console.error("Upload completed but no URL was returned:", res);
          return;
        }

        onChange(uploadedUrl);
      }}
      onUploadError={(error: Error) => {
        console.error("Upload error:", error);
      }}
    />
  );
};
