export type Env = {
  RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  FRONTEND_URL: string;
  TURNSTILE_SECRET_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
};

export type AdminIdentity = { id: number; email: string; role: string; permissions: string[] };

declare module "hono" {
  interface ContextVariableMap {
    admin: AdminIdentity;
  }
}
