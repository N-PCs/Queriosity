import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { supabase } from "../supabase";
import { tavilyClient, getModel } from "../ai";
import { generateText } from "ai";
import { z } from "zod";

const router = Router();

const querySchema = z.object({
  question: z.string().min(1),
});

router.post("/query", optionalAuth, async (req, res) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { question } = parsed.data;
  const customGeminiKey = req.headers["x-gemini-key"] as string | undefined;
  const customGroqKey = req.headers["x-groq-key"] as string | undefined;
  const requestedProvider = (req.headers["x-ai-provider"] as string | undefined) || "auto";

  const hasCustomKey = Boolean(customGeminiKey || customGroqKey);

  // Check daily limit for logged-in users using host key (no custom API key)
  if (req.userId && !hasCustomKey) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .gte("created_at", twentyFourHoursAgo);

      if (countError) {
        console.error("Failed to check daily query limit:", countError);
      } else if (count !== null && count >= 10) {
        res.status(429).json({
          error: "Daily query limit reached (10 queries/day). Please set your own API key in settings to continue.",
          code: "LIMIT_REACHED"
        });
        return;
      }
    } catch (limitErr: any) {
      console.error("Error while checking limit:", limitErr.message);
    }
  }

  try {
    let searchResult;
    try {
      searchResult = await tavilyClient.search(question, {
        searchDepth: "basic",
        maxResults: 4,
      });
    } catch (searchErr: any) {
      console.error("Tavily search failed:", searchErr.message || searchErr);
      searchResult = { results: [], query: question, responseTime: 0, images: [], requestId: "" };
    }

    const context = searchResult.results
      .map((r: any) => `[${r.title}](${r.url}): ${r.content}`)
      .join("\n\n");

    const systemPrompt = searchResult.results.length > 0
      ? `You are a helpful research assistant. Answer the user's question based on the provided search results. Cite sources where applicable.`
      : `You are a helpful AI assistant. Answer the user's question to the best of your ability.`;

    const prompt = searchResult.results.length > 0
      ? `Search results:\n${context}\n\nQuestion: ${question}`
      : `Question: ${question}`;

    // Candidate model fallback lists
    const geminiModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

    const groqModels = ["llama-3.3-70b-versatile", "llama3-8b-8192"];

    const attempts: { provider: "groq" | "gemini"; modelName: string }[] = [];

    if (requestedProvider === "groq") {
      groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
      geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
    } else if (requestedProvider === "gemini") {
      geminiModels.forEach((m) => attempts.push({ provider: "gemini", modelName: m }));
      groqModels.forEach((m) => attempts.push({ provider: "groq", modelName: m }));
    } else {
      if (customGroqKey || process.env.GROQ_API_KEY) {
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


    if (req.userId) {
      const { error: dbError } = await supabase.from("queries").insert({
        user_id: req.userId,
        question,
        answer: text,
        sources: searchResult.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      });

      if (dbError) {
        console.error("Failed to save query:", dbError);
      }
    }

    res.json({
      answer: text,
      sources: searchResult.results,
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
      res.status(429).json({
        error: "Daily AI usage limit reached. Please set your own API key in settings to continue.",
        code: "LIMIT_REACHED",
      });
      return;
    }

    res.status(500).json({ error: `Failed to process query: ${err.message}` });
  }
});


router.get("/history", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("queries")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ queries: data || [] });
});

export default router;
