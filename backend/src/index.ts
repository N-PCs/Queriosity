import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
