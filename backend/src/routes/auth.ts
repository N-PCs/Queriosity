import { Hono } from "hono";
import { getSupabase, getSupabaseAdmin } from "../supabase";
import { z } from "zod";
import type { AppEnv } from "../types";

const auth = new Hono<AppEnv>();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Extracts a human-readable message from Supabase AuthError objects.
 * AuthError has non-enumerable properties, so JSON.stringify() returns "{}".
 */
function extractErrorMessage(error: any): string {
  if (!error) return "Unknown error";

  // Check for retryable fetch errors (Supabase unreachable)
  if (error.name === "AuthRetryableFetchError" || error.status === 530) {
    return "Unable to connect to the authentication service. The database may be paused or unreachable. Please check your Supabase dashboard.";
  }

  // Direct .message (works for normal Error subclasses)
  if (typeof error.message === "string" && error.message.length > 0 && error.message !== "{}") {
    return error.message;
  }

  // Some Supabase errors use .msg
  if (typeof error.msg === "string" && error.msg.length > 0) {
    return error.msg;
  }

  // Try reading all own properties (including non-enumerable)
  try {
    const props: Record<string, any> = {};
    for (const key of Object.getOwnPropertyNames(error)) {
      if (key !== "stack") props[key] = error[key];
    }
    const serialized = JSON.stringify(props);
    if (serialized && serialized !== "{}") return serialized;
  } catch {}

  // Try String coercion
  const str = String(error);
  if (str && str !== "[object Object]") return str;

  return "Unknown authentication error";
}

// Debug endpoint — verifies env vars are loaded without exposing values
auth.get("/debug", (c) => {
  const env = c.env || {};
  return c.json({
    has_SUPABASE_URL: Boolean(env.SUPABASE_URL),
    has_SUPABASE_ANON_KEY: Boolean(env.SUPABASE_ANON_KEY),
    has_SUPABASE_SERVICE_KEY: Boolean(env.SUPABASE_SERVICE_KEY),
    has_GOOGLE_GENERATIVE_AI_API_KEY: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
    has_GROQ_API_KEY: Boolean(env.GROQ_API_KEY),
    has_TAVILY_API_KEY: Boolean(env.TAVILY_API_KEY),
    supabase_url_prefix: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 20) + "..." : "NOT SET",
    timestamp: new Date().toISOString(),
  });
});

auth.post("/signup", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { email, password } = parsed.data;

  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const msg = extractErrorMessage(error);
      console.error("Signup error:", error.name, "status:", (error as any).status, "msg:", msg);
      return c.json({ error: msg }, 400);
    }

    if (!data.user) {
      return c.json({ error: "Signup failed - no user returned. The email may already be registered." }, 400);
    }

    return c.json({ user: data.user, session: data.session }, 201);
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    console.error("Signup exception:", msg);
    return c.json({ error: msg }, 500);
  }
});

auth.post("/login", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { email, password } = parsed.data;
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = extractErrorMessage(error);
      console.error("Login error:", error.name, "status:", (error as any).status, "msg:", msg);
      return c.json({ error: msg }, 401);
    }

    return c.json({ user: data.user, session: data.session });
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    console.error("Login exception:", msg);
    return c.json({ error: msg }, 500);
  }
});

auth.post("/logout", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const supabaseAdmin = getSupabaseAdmin(c.env);
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      const msg = extractErrorMessage(error);
      return c.json({ error: msg }, 500);
    }

    return c.json({ message: "Logged out" });
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    console.error("Logout error:", msg);
    return c.json({ error: msg }, 500);
  }
});

export default auth;
