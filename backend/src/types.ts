export interface Bindings {
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  TAVILY_API_KEY?: string;
  CORS_ORIGIN?: string;
  [key: string]: any;
}

export interface Variables {
  userId?: string;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
