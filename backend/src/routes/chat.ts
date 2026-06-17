import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../supabase";
import { tavilyClient, getModel } from "../ai";
import { generateText } from "ai";
import { z } from "zod";

const router = Router();

const querySchema = z.object({
  question: z.string().min(1),
});

router.post("/query", requireAuth, async (req, res) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { question } = parsed.data;

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
      model: getModel("gemini-2.0-flash"),
      system: systemPrompt,
      prompt,
    });

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

    res.json({
      answer: text,
      sources: searchResult.results,
    });
  } catch (err: any) {
    console.error("Query error:", err.message, err.stack);
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
