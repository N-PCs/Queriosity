import { Hono } from "hono";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { getSupabase } from "../supabase";
import { getTavilyClient, getModel } from "../ai";
import { generateText } from "ai";
import { z } from "zod";
import type { AppEnv } from "../types";

const chat = new Hono<AppEnv>();

const querySchema = z.object({
  question: z.string().min(1),
});

chat.post("/query", optionalAuth, async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON in request body" }, 400);
  }

  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { question } = parsed.data;
  const customGeminiKey = c.req.header("x-gemini-key");
  const customGroqKey = c.req.header("x-groq-key");
  const requestedProvider = c.req.header("x-ai-provider") || "auto";

  const userId = c.get("userId");
  const hasCustomKey = Boolean(customGeminiKey || customGroqKey);

  const supabase = getSupabase(c.env);

  // Check daily limit for logged-in users using host key (no custom API key)
  if (userId && !hasCustomKey) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", twentyFourHoursAgo);

      if (countError) {
        console.error("Failed to check daily query limit:", countError);
      } else if (count !== null && count >= 10) {
        return c.json(
          {
            error: "Daily query limit reached (10 queries/day). Please set your own API key in settings to continue.",
            code: "LIMIT_REACHED",
          },
          429
        );
      }
    } catch (limitErr: any) {
      console.error("Error while checking limit:", limitErr.message);
    }
  }

  try {
    let searchResult;
    try {
      const tavilyClient = getTavilyClient(c.env);
      searchResult = await tavilyClient.search(question, {
        searchDepth: "basic",
        maxResults: 4,
        includeImages: true,
      });
    } catch (searchErr: any) {
      console.error("Tavily search failed:", searchErr.message || searchErr);
      searchResult = { results: [], query: question, responseTime: 0, images: [], requestId: "" };
    }

    const context = searchResult.results
      .map((r: any, idx: number) => `[Source ${idx + 1}] (${r.url}): ${r.content}`)
      .join("\n\n");

    const systemPrompt = searchResult.results.length > 0
      ? `You are a helpful research assistant. Answer the user's question based on the provided search results.
You MUST cite your sources using simple numbers in brackets like [1], [2], etc., corresponding to the sources listed in the context.
At the very end of your response, you MUST provide 2-3 short, relevant follow-up questions.
Format the follow-up section exactly like this:
Related questions:
- First question?
- Second question?
- Third question?`
      : `You are a helpful AI assistant. Answer the user's question to the best of your ability.
At the very end of your response, you MUST provide 2-3 short, relevant follow-up questions.
Format the follow-up section exactly like this:
Related questions:
- First question?
- Second question?
- Third question?`;

    const prompt = searchResult.results.length > 0
      ? `Search results:\n${context}\n\nQuestion: ${question}`
      : `Question: ${question}`;

    // Candidate model fallback lists
    const geminiModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
    const groqModels = ["llama-3.3-70b-versatile", "llama3-8b-8192"];

    const attempts: { provider: "groq" | "gemini"; modelName: string }[] = [];

    const defaultGroqKey = c.env.GROQ_API_KEY || process.env.GROQ_API_KEY;

    if (requestedProvider === "groq") {
      groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
      geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
    } else if (requestedProvider === "gemini") {
      geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
      groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
    } else {
      if (customGroqKey || defaultGroqKey) {
        groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
        geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
      } else {
        geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
        groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
      }
    }

    let text = "";
    let providerUsed: "gemini" | "groq" = "gemini";
    let lastError: any = null;

    for (const attempt of attempts) {
      try {
        const model = getModel({
          provider: attempt.provider,
          model: attempt.modelName,
          customGeminiKey,
          customGroqKey,
          env: c.env,
        });

        const result = await generateText({
          model: model as any,
          system: systemPrompt,
          prompt,
        });

        text = result.text;
        providerUsed = attempt.provider;
        lastError = null;
        break;
      } catch (err: any) {
        console.error(
          `AI generation failed with provider '${attempt.provider}' (${attempt.modelName}):`,
          err.message || err
        );
        lastError = err;
      }
    }

    if (!text && lastError) {
      throw lastError;
    }

    const savedSources = [
      ...searchResult.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })),
      ...(searchResult.images && searchResult.images.length > 0
        ? [{ type: "images", list: searchResult.images }]
        : []),
    ];

    if (userId) {
      const { error: dbError } = await supabase.from("queries").insert({
        user_id: userId,
        question,
        answer: text,
        sources: savedSources,
      });

      if (dbError) {
        console.error("Failed to save query:", dbError);
      }
    }

    return c.json({
      answer: text,
      sources: savedSources,
      providerUsed,
    });
  } catch (err: any) {
    console.error("Query error:", err.message, err.stack);
    const isQuotaError =
      err.status === 429 ||
      err.message?.toLowerCase().includes("quota") ||
      err.message?.toLowerCase().includes("limit") ||
      err.message?.toLowerCase().includes("exhausted");

    if (isQuotaError && !hasCustomKey) {
      return c.json(
        {
          error: "Daily AI usage limit reached. Please set your own API key in settings to continue.",
          code: "LIMIT_REACHED",
        },
        429
      );
    }

    return c.json({ error: `Failed to process query: ${err.message}` }, 500);
  }
});

chat.get("/history", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from("queries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ queries: data || [] });
});

export default chat;
