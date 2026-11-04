import "server-only";
import { z } from "zod";
import { fieldErrors } from "@/lib/validations/common";
import { friendlyError, type ActionResult } from "./errors";
import { assertRole, type AppRole, type SessionContext } from "@/lib/auth/session";

/** Parse FormData into a plain object (multi-value keys become arrays when listed). */
export function formToObject(form: FormData, arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key).filter((v) => typeof v === "string") as string[];
    out[key] = arrays.includes(key) ? all.filter(Boolean) : all[0];
  }
  for (const k of arrays) out[k] ??= [];
  return out;
}

/**
 * Wraps a server action: role check -> zod validation -> handler -> friendly errors.
 * Authorization is ALSO enforced by RLS / database functions; this is defense in depth.
 */
export function makeAction<S extends z.ZodType, R = undefined>(opts: { roles: AppRole[]; schema: S; arrays?: string[]; handler: (input: z.infer<S>, ctx: SessionContext, form: FormData) => Promise<ActionResult<R> | void> }) {
  return async (_prev: ActionResult<unknown> | undefined, form: FormData): Promise<ActionResult<R>> => {
    let ctx: SessionContext;
    try { ctx = await assertRole(...opts.roles); } catch (e) { return { ok: false, error: (e as Error).message }; }
    const parsed = opts.schema.safeParse(formToObject(form, opts.arrays));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    try {
      return (await opts.handler(parsed.data, ctx, form)) ?? { ok: true };
    } catch (e) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      return { ok: false, error: friendlyError(e) };
    }
  };
}

/** Throw a Supabase error so makeAction formats it. (.single() already errors when no row matches.) */
export function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}
