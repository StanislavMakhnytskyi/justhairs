import { z } from "zod";

/**
 * Environment validation. Nothing here throws at import time: a build (CI has
 * no secrets) and local dev must work without env vars, and the catalog pages
 * fall back gracefully. Instead `validateEnv()` reports what is missing; it is
 * logged at server start (instrumentation.ts) and surfaced by /api/health.
 *
 * In a production *runtime* (not the build) every variable below is required.
 */
const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
} as const;

export type EnvReport = {
  ok: boolean;
  /** Names only — values never leave this module. */
  invalid: string[];
};

export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function validateEnv(
  env: Record<string, string | undefined> = process.env,
): EnvReport {
  const invalid = Object.entries(REQUIRED)
    .filter(([name, schema]) => !schema.safeParse(env[name]?.trim()).success)
    .map(([name]) => name);
  return { ok: invalid.length === 0, invalid };
}

/** True when missing env should be treated as a misconfiguration. */
export function envIsRequired(): boolean {
  return process.env.NODE_ENV === "production" && !isBuildPhase();
}

/** The public origin of the site, for metadata, sitemap and robots. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
