import 'dotenv/config';

export const config = {
  pocketbaseUrl: process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8080',
  pbAdminEmail: process.env.PB_ADMIN_EMAIL || undefined,
  pbAdminPassword: process.env.PB_ADMIN_PASSWORD || undefined,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  port: Number(process.env.PORT ?? 8787),
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
  },
};
