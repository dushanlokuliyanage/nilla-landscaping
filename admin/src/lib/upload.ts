const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const VIDEO_PRESET = import.meta.env.VITE_CLOUDINARY_VIDEO_PRESET;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

export type ImageUploadOptions = {
  folder?: string;
  scale?: number | "original";
  autoSide?: "width" | "height" | "longest";
};

export async function uploadImage(file: File, options: ImageUploadOptions = {}): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image upload is not set up yet (Cloudinary settings missing)");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name} is larger than 10 MB`);
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);
  if (options.folder) body.append("folder", options.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? "Upload failed");
  }

  const original = data.secure_url as string;
  if (file.type === "image/gif" || options.scale === "original") return original;
  const width = options.scale ?? 1200;
  const autoSide = options.autoSide ?? "width";
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
    if (!file.type.startsWith("video/")) {
      reject(new Error(`${file.name} is not a video`));
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      reject(new Error("This video is larger than 40 MB. Compress it or use a shorter clip."));
      return;
    }

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
