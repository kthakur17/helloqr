export const THEME_KEY = "hq:theme";
export const THEME_EVENT = "hq-theme";

/** Runs in <head> before the first paint, so a saved choice never flashes the other theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
