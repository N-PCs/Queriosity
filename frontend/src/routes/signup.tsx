import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signup, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signup(email, password);
      setSuccess(true);
      setTimeout(() => router.navigate({ to: "/login" }), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="liquid-glass-strong absolute inset-4 rounded-3xl lg:inset-6" />

      <div className="relative z-10 w-full max-w-sm">
        <Link
          to="/"
          className="liquid-glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="liquid-glass-strong rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tighter text-white">
              queriosity
            </span>
          </div>

          <h1 className="text-2xl font-medium text-white mb-2">Create account</h1>
          <p className="text-sm text-white/60 mb-8">Join the curious community</p>

          {success ? (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-4 text-sm text-green-400 text-center">
              Account created! Check your email to confirm, then sign in.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="liquid-glass w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="liquid-glass w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
                  placeholder="At least 6 characters"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="liquid-glass-strong w-full rounded-xl py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-white/50">
            Already have an account?{" "}
            <Link to="/login" className="text-white/80 hover:text-white underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
