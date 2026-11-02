/**
 * Pass-through layout for the pay / confirmation pages. It exists so the
 * group's own not-found.tsx and error.tsx have a boundary to attach to (a
 * route group without a layout falls through to the root ones). Nothing here
 * may suspend or stream — no loading.tsx either — so `notFound()` in the pages
 * stays a real HTTP 404 (tests/smoke/routes.spec.ts).
 */
export default function SecureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
