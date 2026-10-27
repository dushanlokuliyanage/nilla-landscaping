import { z } from "zod";

const cartItemSchema = z.object({
  key: z.string().min(1),
  productId: z.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  image: z.string().nullable(),
  unitPrice: z.number().finite().nonnegative(),
  unit: z.string().min(1),
  quantity: z.number().int().min(1).max(100000),
  stockQuantity: z.number().int().min(0),
  options: z.record(z.string(), z.string()),
});

export const cartStorageSchema = z.array(cartItemSchema);

export const inquiryFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters)").max(120),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().max(40).refine((value) => !value || /^[+()\d\s.-]{7,40}$/.test(value), "Enter a valid phone number"),
  service: z.string().trim().min(1, "Choose a service").max(120),
  message: z.string().trim().min(5, "Message must contain at least 5 characters").max(5000, "Message is too long"),
});

export const orderFormSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your name (at least 2 characters)").max(120),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,40}$/, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  address: z.string().trim().max(1000, "Address is too long"),
  note: z.string().trim().max(2000, "Note is too long"),
});

export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the entered information";
}
