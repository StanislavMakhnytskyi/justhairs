// Applies the persisted / system theme to <html data-theme> before first paint
// to avoid a flash. Kept tiny and dependency-free.
const script = `(function(){try{var t=localStorage.getItem('justhairs-theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

// Next's documented pattern (preventing-flash-before-hydration.md): React warns
// in dev when it *client*-renders a <script> — which happens for the pay /
// confirmation 404 pages, served as the minimal error document and rendered in
// the browser. The server output stays an executable script; a client render
// emits an inert text/plain one (a script inserted by DOM updates would not
// run anyway). suppressHydrationWarning covers the type difference.
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
