import type { MiddlewareHandler } from "hono";
import { getSupabase } from "../supabase";
import type { AppEnv } from "../types";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", data.user.id);
  await next();
};

export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return await next();
  }

  const token = authHeader.slice(7);
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      c.set("userId", data.user.id);
    }
  } catch {}
  await next();
};
