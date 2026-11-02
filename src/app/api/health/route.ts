import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { envIsRequired, validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const TTL_MS = 15_000;

type Health = { status: "ok" | "degraded"; database: "ok" | "error" | "unconfigured" };

// Per server instance. A public, unauthenticated endpoint must not turn every
// hit into a database round trip, so the result is reused for TTL_MS (and
// concurrent callers share one in-flight check).
let cached: { at: number; result: Promise<Health> } | null = null;

async function check(): Promise<Health> {
  const env = validateEnv();
  if (!env.ok && envIsRequired()) {
    // Names only, server log only — the response never says what is missing.
    console.error(JSON.stringify({ level: "error", event: "env.invalid", invalid: env.invalid }));
  }

  let database: Health["database"] = "unconfigured";
  if (isSupabaseConfigured) {
    try {
      // The public key: the same access any visitor has (the catalog), so a
      // health probe never needs or exercises the service-role secret.
      const { error } = await createPublicClient()
        .from("services")
        .select("id", { head: true })
        .limit(1);
      database = error ? "error" : "ok";
    } catch {
      database = "error";
    }
  }

  const healthy = database === "ok" && (env.ok || !envIsRequired());
  return { status: healthy ? "ok" : "degraded", database };
}

/** Liveness + database reachability. Public body: `{ status, database }`. */
export async function GET() {
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    cached = { at: now, result: check() };
  }
  const body = await cached.result;
  return Response.json(body, { status: body.status === "ok" ? 200 : 503, headers });
}
