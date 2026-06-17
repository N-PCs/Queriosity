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
    const searchResult = await tavilyClient.search(question, {
      searchDepth: "advanced",
      maxResults: 5,
    });

    const context = searchResult.results
      .map((r) => `[${r.title}](${r.url}): ${r.content}`)
      .join("\n\n");

    const { text } = await generateText({
      model: getModel("gpt-4o"),
      system: `You are a helpful research assistant. Answer the user's question based on the provided search results. Cite sources where applicable.`,
      prompt: `Search results:\n${context}\n\nQuestion: ${question}`,
    });

    const { error: dbError } = await supabase.from("queries").insert({
      user_id: req.userId,
      question,
      answer: text,
      sources: searchResult.results.map((r) => ({
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
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Failed to process query" });
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

  res.json({ queries: data });
});

export default router;
