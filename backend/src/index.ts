import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowedHeaders: ["Content-Type", "Authorization", "x-gemini-key"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.type === "entity.parse.failed" ? "Invalid JSON in request body" : err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
