// Server-safe module (no "use client") so the root layout can inline this string.
export const THEME_STORAGE_KEY = "theme";

/** Inline script injected in <head> to apply the theme before first paint (prevents flash). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(d)r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
