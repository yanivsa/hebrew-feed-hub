// ⚠️ חשוב: בכל שינוי יש לעדכן גם את הגרסה וגם את שעת התיקון המופיעים בדף הבית.
const FALLBACK_VERSION = "v0.3.8";
const FALLBACK_RELEASED_AT = "18/01/2026 00:30 Asia/Jerusalem";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? FALLBACK_VERSION;
export const APP_RELEASED_AT = import.meta.env.VITE_APP_RELEASED_AT ?? FALLBACK_RELEASED_AT;
export const APP_VERSION_LABEL = `גרסה ${APP_VERSION}`;
export const APP_RELEASE_LABEL = `עודכן ${APP_RELEASED_AT}`;
