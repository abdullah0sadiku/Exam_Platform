import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

interface ResolvedConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

async function loadUserConfig(userId: string): Promise<ResolvedConfig | null> {
  const cfg = await prisma.userEmailConfig.findUnique({ where: { userId } });
  if (!cfg) return null;
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.username ?? undefined,
    pass: cfg.encryptedPassword ? decryptApiKey(cfg.encryptedPassword) : undefined,
    from: cfg.fromAddress,
  };
}

function loadEnvConfig(): ResolvedConfig {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host) throw new Error("Missing required SMTP env var: SMTP_HOST");
  if (!from) throw new Error("Missing required SMTP env var: SMTP_FROM");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    secure: port === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from,
  };
}

function buildTransporter(cfg: ResolvedConfig): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Optional — if supplied, the user's saved UserEmailConfig is used when
   * present; otherwise the code falls back to SMTP_* env vars.
   */
  userId?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const userCfg = opts.userId ? await loadUserConfig(opts.userId) : null;
  const cfg = userCfg ?? loadEnvConfig();
  await buildTransporter(cfg).sendMail({
    from: cfg.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export async function hasEmailConfig(userId: string): Promise<boolean> {
  if (await prisma.userEmailConfig.findUnique({ where: { userId } })) return true;
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}
