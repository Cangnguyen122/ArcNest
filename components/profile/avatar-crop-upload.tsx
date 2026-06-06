"use client";

import Cropper, { Area } from "react-easy-crop";
import Image from "next/image";
import { Camera, Check, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
interface AvatarCropUploadProps {
  value: string;
  disabled?: boolean;
  onChange: (url?: string) => void;
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

const createImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));

    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
};

const getCroppedImageFile = async (
  imageSrc: string,
  pixelCrop: Area,
): Promise<File> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  canvas.width = 512;
  canvas.height = 512;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    512,
    512,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image"));
          return;
        }

        resolve(
          new File([blob], `avatar-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
};

export const AvatarCropUpload = ({
  value,
  disabled,
  onChange,
}: AvatarCropUploadProps) => {
  const [localImage, setLocalImage] = useState("");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const previewUrl = value;

  const { startUpload, isUploading } = useUploadThing("profileImage", {
    onClientUploadComplete: (res) => {
      const uploadedUrl = getUploadedUrl(res?.[0]);

      if (!uploadedUrl) {
        console.error("Upload completed but no URL was returned:", res);
        return;
      }

      onChange(uploadedUrl);
      resetLocalCrop();
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const resetLocalCrop = () => {
    if (localImage) {
      URL.revokeObjectURL(localImage);
    }

    setLocalImage("");
    setIsCropOpen(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleFileSelect = (file?: File) => {
    if (!file) return;

    resetLocalCrop();

    const objectUrl = URL.createObjectURL(file);

    setLocalImage(objectUrl);
    setIsCropOpen(true);
  };

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const applyCrop = async () => {
    if (!localImage || !croppedAreaPixels) return;

    try {
      setIsPreparingUpload(true);

      const file = await getCroppedImageFile(localImage, croppedAreaPixels);
      await startUpload([file]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsPreparingUpload(false);
    }
  };

  return (
    <div className="relative">
      {previewUrl ? (
        <div className="relative h-20 w-20">
          <div className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/15 bg-black/30 shadow-[0_16px_38px_rgba(0,0,0,0.35)]">
            <Image
              fill
              src={previewUrl}
              alt="Profile avatar"
              className="rounded-full object-cover"
              sizes="80px"
            />

            <label className="absolute inset-0 grid cursor-pointer place-items-center rounded-full bg-black/55 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                Change
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={disabled}
                className="hidden"
                onChange={(event) => {
                  handleFileSelect(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              resetLocalCrop();
              onChange("");
            }}
            className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.4)] transition hover:bg-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="group flex h-[112px] w-[128px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-black/20 px-3 text-center transition hover:border-[#5865F2]/60 hover:bg-[#5865F2]/10">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07] text-zinc-300 transition group-hover:bg-[#5865F2]/25 group-hover:text-white">
            <Camera className="h-4 w-4" />
          </div>

          <p className="mt-2 text-xs font-black leading-tight text-white">
            Choose image
          </p>

          <p className="mt-1 text-[11px] leading-tight text-zinc-500">
            Crop before upload
          </p>

          <input
            type="file"
            accept="image/*"
            disabled={disabled}
            className="hidden"
            onChange={(event) => {
              handleFileSelect(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {isCropOpen && (
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/10 bg-[#10131A] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-black text-white">
                  Crop avatar
                </p>
                <p className="text-xs text-zinc-400">
                  Move and zoom your image before upload.
                </p>
              </div>

              <button
                type="button"
                onClick={resetLocalCrop}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-[360px] bg-black">
              <Cropper
                image={localImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>Zoom</span>
                  <span>{zoom.toFixed(1)}x</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-[#5865F2]"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetLocalCrop}
                  className="h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPreparingUpload || isUploading}
                  onClick={applyCrop}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5865F2] px-4 text-sm font-black text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreparingUpload || isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isPreparingUpload || isUploading ? "Uploading..." : "Apply crop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};