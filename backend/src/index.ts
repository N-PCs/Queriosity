import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const origin = c.env?.CORS_ORIGIN || process.env.CORS_ORIGIN || "*";
  const corsMiddleware = cors({
    origin,
    allowHeaders: ["Content-Type", "Authorization", "x-gemini-key", "x-groq-key", "x-ai-provider"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  return corsMiddleware(c, next);
});

app.get("/", (c) => {
  return c.json({
    name: "Queriosity API (Cloudflare Workers)",
    status: "online",
    health: "/health",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/auth", authRoutes);
app.route("/chat", chatRoutes);

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: err.message || "Internal server error",
    },
    500
  );
});

export default app;
