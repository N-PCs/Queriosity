import { google } from "@ai-sdk/google";
import { tavily } from "@tavily/core";

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export function getModel(model = "gemini-2.5-flash") {
  return google(model);
}
