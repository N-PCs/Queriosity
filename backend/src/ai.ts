import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq, createGroq } from "@ai-sdk/groq";
import { tavily } from "@tavily/core";

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export type AIProvider = "gemini" | "groq";

export interface GetModelOptions {
  provider?: AIProvider;
  model?: string;
  customGeminiKey?: string;
  customGroqKey?: string;
}

export function getModel(options: GetModelOptions = {}): any {
  const { provider = "gemini", customGeminiKey, customGroqKey } = options;

  if (provider === "groq") {
    const modelName = options.model || "llama-3.3-70b-versatile";
    if (customGroqKey) {
      const customGroq = createGroq({ apiKey: customGroqKey });
      return customGroq(modelName);
    }
    return groq(modelName);
  }

  // Default provider: gemini
  const modelName = options.model || "gemini-2.5-flash";
  if (customGeminiKey) {
    const customGoogle = createGoogleGenerativeAI({
      apiKey: customGeminiKey,
    });
    return customGoogle(modelName);
  }
  return google(modelName);
}

