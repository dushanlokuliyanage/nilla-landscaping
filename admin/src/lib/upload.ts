import { imageFileSchema, imageUploadOptionsSchema, validationMessage, videoFileSchema } from "@/lib/validation";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const VIDEO_PRESET = import.meta.env.VITE_CLOUDINARY_VIDEO_PRESET;

export type ImageUploadOptions = {
  folder?: string;
  scale?: number | "original";
  autoSide?: "width" | "height" | "longest";
};

export async function uploadImage(file: File, options: ImageUploadOptions = {}): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image upload is not set up yet (Cloudinary settings missing)");
  }
  const validFile = imageFileSchema.safeParse(file);
  if (!validFile.success) throw new Error(`${file.name}: ${validationMessage(validFile.error)}`);
  const validOptions = imageUploadOptionsSchema.safeParse(options);
  if (!validOptions.success) throw new Error(validationMessage(validOptions.error));

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);
  if (validOptions.data.folder) body.append("folder", validOptions.data.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? "Upload failed");
  }

  const original = data.secure_url as string;
  if (file.type === "image/gif" || validOptions.data.scale === "original") return original;
  const width = validOptions.data.scale ?? 1200;
  const autoSide = validOptions.data.autoSide ?? "width";
  const resize = autoSide === "width" ? `w_${width}`
    : autoSide === "height" ? `h_${width}`
      : `w_${width},h_${width}`;
  return original.replace("/upload/", `/upload/f_auto,q_auto,${resize},c_limit/`);
}

type CloudinaryResult = {
  secure_url?: string;
  error?: { message?: string };
};

export function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void,
  folder?: string
): Promise<{ videoUrl: string; posterUrl: string }> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !VIDEO_PRESET) {
      reject(new Error("Video upload is not set up yet (Cloudinary video preset missing)"));
      return;
    }
    const validFile = videoFileSchema.safeParse(file);
    if (!validFile.success) { reject(new Error(`${file.name}: ${validationMessage(validFile.error)}`)); return; }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", VIDEO_PRESET);
    if (folder) body.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: CloudinaryResult = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // keep the empty result
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        const base = data.secure_url;
        resolve({
          // Small, phone-friendly mp4 that plays in every browser
          videoUrl: base
            .replace("/upload/", "/upload/q_auto,w_540,vc_h264/")
            .replace(/\.[a-z0-9]+$/i, ".mp4"),
          // A picture from the first second of the video
          posterUrl: base
            .replace("/upload/", "/upload/so_0,w_540/")
            .replace(/\.[a-z0-9]+$/i, ".jpg"),
        });
      } else {
        reject(new Error(data.error?.message ?? "Video upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}
