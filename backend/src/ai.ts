import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { tavily } from "@tavily/core";

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export function getModel(model = "gemini-1.5-flash", customApiKey?: string) {
  if (customApiKey) {
    const customGoogle = createGoogleGenerativeAI({
      apiKey: customApiKey,
    });
    return customGoogle(model);
  }
  return google(model);
}

