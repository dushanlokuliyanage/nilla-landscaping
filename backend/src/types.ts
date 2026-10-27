export type Env = {
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  FRONTEND_URL: string;
  GOOGLE_MAPS_API_KEY?: string;
};

export type AdminIdentity = { id: number; email: string; role: string; permissions: string[] };

declare module "hono" {
  interface ContextVariableMap {
    admin: AdminIdentity;
  }
}
