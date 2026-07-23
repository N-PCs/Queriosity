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
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ user: data.user, session: data.session }, 201);
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
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return c.json({ error: error.message }, 401);
  }

  return c.json({ user: data.user, session: data.session });
});

auth.post("/logout", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const token = authHeader.slice(7);
  const supabaseAdmin = getSupabaseAdmin(c.env);
  const { error } = await supabaseAdmin.auth.admin.signOut(token);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ message: "Logged out" });
});

export default auth;
