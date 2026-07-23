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
  // Direct .message (works for normal Error subclasses)
  if (error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }
  // Some Supabase errors use .msg
  if (error && typeof error.msg === "string" && error.msg.length > 0) {
    return error.msg;
  }
  // Try reading all own properties (including non-enumerable)
  if (error && typeof error === "object") {
    try {
      const props: Record<string, any> = {};
      for (const key of Object.getOwnPropertyNames(error)) {
        props[key] = error[key];
      }
      const serialized = JSON.stringify(props);
      if (serialized && serialized !== "{}") return serialized;
    } catch {}
  }
  // Try String coercion
  if (error) {
    const str = String(error);
    if (str && str !== "[object Object]") return str;
  }
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
      // Diagnostic: log every possible property
      console.error("Signup error raw typeof:", typeof error);
      console.error("Signup error constructor:", error?.constructor?.name);
      console.error("Signup error .message:", error.message);
      console.error("Signup error .name:", (error as any).name);
      console.error("Signup error .status:", (error as any).status);
      console.error("Signup error .code:", (error as any).code);
      console.error("Signup error .cause:", (error as any).cause);
      try {
        console.error("Signup error own props:", Object.getOwnPropertyNames(error));
        const allProps: Record<string, any> = {};
        for (const key of Object.getOwnPropertyNames(error)) {
          allProps[key] = (error as any)[key];
        }
        console.error("Signup error all own values:", JSON.stringify(allProps));
      } catch (logErr) {
        console.error("Could not log own props:", logErr);
      }
      try {
        console.error("Signup error keys:", Object.keys(error as any));
      } catch {}
      console.error("Signup error String():", String(error));

      const msg = extractErrorMessage(error);
      console.error("Signup extracted msg:", msg);
      return c.json({ error: msg, _debug_type: error?.constructor?.name, _debug_status: (error as any).status }, 400);
    }

    // Also handle the case where data.user is null (email already registered with autoconfirm off)
    if (!data.user) {
      return c.json({ error: "Signup failed - no user returned. The email may already be registered." }, 400);
    }

    return c.json({ user: data.user, session: data.session }, 201);
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    console.error("Signup catch error:", msg);
    console.error("Signup catch raw:", err);
    return c.json({ error: msg, _debug: String(err) }, 500);
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
      console.error("Login Supabase error:", msg, "| status:", (error as any).status);
      return c.json({ error: msg }, 401);
    }

    return c.json({ user: data.user, session: data.session });
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    console.error("Login catch error:", msg);
    return c.json({ error: err.message || "Login failed" }, 500);
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
