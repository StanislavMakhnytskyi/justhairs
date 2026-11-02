import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnv, envIsRequired } = await import("@/lib/env");
  const report = validateEnv();
  if (!report.ok && envIsRequired()) {
    // Not fatal (the catalog pages degrade gracefully) but loud, and /api/health
    // reports 503 until it is fixed.
    console.error(
      JSON.stringify({
        level: "error",
        event: "env.invalid",
        invalid: report.invalid,
      }),
    );
  }
}

/**
 * Called for every server error (render, route handler, server action).
 * Structured so log drains can index it. This is the hook point for a
 * monitoring SDK (e.g. Sentry.captureRequestError) — add it here, not in pages.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const err = error as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request.error",
      message: err.message,
      digest: err.digest,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    }),
  );
};
