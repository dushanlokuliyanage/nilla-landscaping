export type Env = {
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  FRONTEND_URL: string;
};

export type AdminIdentity = { id: number; email: string; role: string };

declare module "hono" {
  interface ContextVariableMap {
    admin: AdminIdentity;
  }
}
