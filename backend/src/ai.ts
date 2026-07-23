import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq, createGroq } from "@ai-sdk/groq";
import { tavily } from "@tavily/core";
import type { Bindings } from "./types";

export function getTavilyClient(env?: Bindings) {
  const apiKey = env?.TAVILY_API_KEY || process.env.TAVILY_API_KEY || "";
  return tavily({ apiKey });
}

export type AIProvider = "gemini" | "groq";

export interface GetModelOptions {
  provider?: AIProvider;
  model?: string;
  customGeminiKey?: string;
  customGroqKey?: string;
  env?: Bindings;
}

export function getModel(options: GetModelOptions = {}): any {
  const { provider = "gemini", customGeminiKey, customGroqKey, env } = options;

  if (provider === "groq") {
    const modelName = options.model || "llama-3.3-70b-versatile";
    const apiKey = customGroqKey || env?.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (apiKey) {
      const groqInstance = createGroq({ apiKey });
      return groqInstance(modelName);
    }
    return groq(modelName);
  }

  // Default provider: gemini
  const modelName = options.model || "gemini-2.5-flash";
  const apiKey = customGeminiKey || env?.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    const googleInstance = createGoogleGenerativeAI({ apiKey });
    return googleInstance(modelName);
  }
  return google(modelName);
}
