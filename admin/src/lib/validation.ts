import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password must contain at least 6 characters"),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name (at least 2 characters)"),
  description: z.string().trim().max(5000, "Description is too long"),
  price: z.number().int().min(0, "Price must be zero or more"),
  unit: z.string().trim().min(1, "Enter a unit"),
  stockQuantity: z.number().int().min(0, "Stock must be zero or more"),
  images: z.array(z.string().trim().min(1, "Remove empty image entries")).max(30, "Use up to 30 images"),
  options: z.array(z.object({ name: z.string().trim().min(1), values: z.array(z.string().trim().min(1)).min(1) })),
});

export const galleryFormSchema = z.object({
  title: z.string().trim().min(2, "Enter a title (at least 2 characters)"),
  category: z.string().trim().min(1, "Choose a category"),
  description: z.string().trim().max(5000, "Description is too long"),
  location: z.string().trim().max(160, "Location is too long").nullable(),
  year: z.number().int().min(1990, "Year must be 1990 or later").max(2100, "Enter a valid year").nullable(),
  images: z.array(z.string().trim().min(1, "Remove empty image entries")).min(1, "Add at least one image").max(30, "Use up to 30 images"),
  isPublished: z.boolean(),
});

export const videoFormSchema = z.object({
  title: z.string().trim().min(2, "Enter a title (at least 2 characters)"),
  category: z.string().trim().min(1, "Choose a category"),
  orientation: z.enum(["vertical", "landscape"]),
  videoUrl: z.url("Upload a video first").refine((value) => value.startsWith("https://res.cloudinary.com/"), "Upload the video using the media uploader"),
  posterUrl: z.union([z.literal(""), z.url("Poster must be a valid URL")]),
  isPublished: z.boolean(),
});

export const teamAccountSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Temporary password must contain at least 8 characters"),
  role: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, "Choose a valid role"),
});

export const roleFormSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, "Use a lowercase role key starting with a letter"),
  name: z.string().trim().min(2, "Role name must contain at least 2 characters").max(60),
  description: z.string().trim().max(240, "Description must be 240 characters or fewer"),
  isActive: z.boolean(),
  permissions: z.array(z.string().regex(/^[a-z]+\.[a-z]+$/)).max(40),
});

export const mediaAssetSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().trim().min(1).max(2000),
  posterUrl: z.string().trim().max(2000).optional(),
  addedAt: z.iso.datetime().optional(),
});

export const imageUploadOptionsSchema = z.object({
  folder: z.string().trim().max(240).optional(),
  scale: z.union([z.literal("original"), z.number().int().min(256).max(3000)]).optional(),
  autoSide: z.enum(["width", "height", "longest"]).optional(),
});

const browserFileSchema = z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, "Choose a file");
export const imageFileSchema = browserFileSchema.refine((file) => file.type.startsWith("image/"), "Choose an image file").refine((file) => file.size <= 10 * 1024 * 1024, "Image must be 10 MB or smaller");
export const videoFileSchema = browserFileSchema.refine((file) => file.type.startsWith("video/"), "Choose a video file").refine((file) => file.size <= 40 * 1024 * 1024, "Video must be 40 MB or smaller");
export const mediaBatchSchema = z.object({
  kind: z.enum(["image", "video"]),
  files: z.array(browserFileSchema).min(1).max(500),
}).superRefine(({ kind, files }, context) => {
  const expectedPrefix = kind === "image" ? "image/" : "video/";
  for (const [index, file] of files.entries()) {
    if (!file.type.startsWith(expectedPrefix)) context.addIssue({ code: "custom", path: ["files", index], message: `Choose ${kind} files only` });
    const maxFileBytes = kind === "image" ? 5 * 1024 * 1024 : 40 * 1024 * 1024;
    if (file.size > maxFileBytes) context.addIssue({ code: "custom", path: ["files", index], message: kind === "image" ? "Each image must be 5 MB or smaller" : "Each video must be 40 MB or smaller" });
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (kind === "image" && totalBytes > 100 * 1024 * 1024) context.addIssue({ code: "custom", path: ["files"], message: "The selected images are over 100 MB in total. Choose a smaller batch." });
});

export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the entered information";
}
