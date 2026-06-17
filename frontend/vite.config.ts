import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: isVercel
    ? { preset: "vercel" }
    : undefined,
});
