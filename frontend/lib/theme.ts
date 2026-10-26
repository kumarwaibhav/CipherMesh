export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "cm-theme";

/**
 * Runs inline in <head> before first paint so the page never flashes the wrong theme.
 * Kept as a string because it must execute before React hydrates.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var dark=t==="dark"||(t!=="light"&&(!window.matchMedia||window.matchMedia("(prefers-color-scheme: dark)").matches));d.classList.toggle("dark",dark);}catch(e){d.classList.add("dark");}})();`;
