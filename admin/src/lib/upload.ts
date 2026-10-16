const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image upload is not set up yet (Cloudinary settings missing)");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 10 MB`);
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? "Upload failed");
  }

  // Smaller, faster images for the shop: auto format and quality, max 1200px wide
  return (data.secure_url as string).replace(
    "/upload/",
    "/upload/f_auto,q_auto,w_1200/"
  );
}