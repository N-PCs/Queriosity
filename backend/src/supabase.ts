import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Bindings } from "./types";

export function getSupabase(env?: Bindings): SupabaseClient {
  const supabaseUrl = env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment bindings or secrets"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseAdmin(env?: Bindings): SupabaseClient {
  const supabaseUrl = env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = env?.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }

  return getSupabase(env);
}
