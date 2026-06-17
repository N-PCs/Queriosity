import { gateway } from "@ai-sdk/gateway";
import { tavily } from "@tavily/core";

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export function getModel(model = "openai/gpt-4o") {
  return gateway(model);
}
