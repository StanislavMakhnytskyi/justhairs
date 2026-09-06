// Applies the persisted / system theme to <html data-theme> before first paint
// to avoid a flash. Kept tiny and dependency-free.
const script = `(function(){try{var t=localStorage.getItem('justhairs-theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
