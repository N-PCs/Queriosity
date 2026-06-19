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
  const customApiKey = req.headers["x-gemini-key"] as string | undefined;

  // Check daily limit for logged-in users using host key (no custom API key)
  if (req.userId && !customApiKey) {
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
          error: "Daily query limit reached (10 queries/day). Please set your own Gemini API key in settings to continue.",
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
      console.error("Tavily search failed:", searchErr.message);
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

    const { text } = await generateText({
      model: getModel("gemini-1.5-flash", customApiKey),
      system: systemPrompt,
      prompt,
    });

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
    });
  } catch (err: any) {
    console.error("Query error:", err.message, err.stack);
    const isQuotaError =
      err.status === 429 ||
      err.message?.toLowerCase().includes("quota") ||
      err.message?.toLowerCase().includes("limit") ||
      err.message?.toLowerCase().includes("exhausted");

    if (isQuotaError && !customApiKey) {
      res.status(429).json({
        error: "Daily AI usage limit reached. Please set your own Gemini API key to continue.",
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
