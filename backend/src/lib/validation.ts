import { z } from "zod";

/** Read untrusted JSON without turning malformed request bodies into 500 errors. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const positiveIdSchema = z.coerce.number().int().positive();

export function parsePositiveId(value: string) {
  const result = positiveIdSchema.safeParse(value);
  return result.success ? result.data : null;
}
