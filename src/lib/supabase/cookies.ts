import type { CookieOptions } from "@supabase/ssr";

export const REMEMBER_COOKIE = "tc_remember";

/**
 * When the user unticks "Remember me" we turn Supabase's persistent auth
 * cookies into browser-session cookies (no maxAge/expires).
 */
export function applyRememberPolicy(name: string, options: CookieOptions, remember: boolean): CookieOptions {
  if (remember || !name.startsWith("sb-") || options.maxAge === 0) return options;
  const { maxAge: _m, expires: _e, ...rest } = options;
  void _m;
  void _e;
  return rest;
}
