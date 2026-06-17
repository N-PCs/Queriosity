import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api/client";
import {
  Sparkles,
  Search,
  Send,
  ArrowRight,
  History,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

interface Message {
  id: string;
  question: string;
  answer: string;
  sources: { title: string; url: string; content: string }[];
  created_at?: string;
}

function ChatPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.navigate({ to: "/login" });
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.chat.history();
      setHistory(res.queries);
    } catch {} finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const q = query.trim();
    setQuery("");
    setLoading(true);

    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        question: q,
        answer: "Thinking...",
        sources: [],
      },
    ]);

    try {
      const res = await api.chat.query(q);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, answer: res.answer, sources: res.sources }
            : m
        )
      );
      loadHistory();
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, answer: `Error: ${err.message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const loadFromHistory = (msg: Message) => {
    setMessages([msg]);
    setShowHistory(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <Sparkles className="h-4 w-4 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 lg:px-10">
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tighter text-white">
              queriosity
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
            </button>
            <button
              onClick={logout}
              className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        <div className="flex flex-1 gap-0 lg:gap-6 px-4 lg:px-10 pb-6">
          {/* History sidebar — overlay on mobile, inline on desktop */}
          {showHistory && (
            <>
              {/* Backdrop (mobile only) */}
              <div
                className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                onClick={() => setShowHistory(false)}
              />
              <aside className="fixed inset-x-4 top-20 z-30 lg:static lg:inset-auto lg:z-auto lg:w-72 shrink-0">
                <div className="liquid-glass-strong rounded-3xl p-4 max-h-[60vh] lg:max-h-[calc(100vh-10rem)] overflow-y-auto">
                  <h3 className="text-xs uppercase tracking-widest text-white/50 mb-3">
                    Past queries
                  </h3>
                  {historyLoading ? (
                    <div className="text-xs text-white/40">Loading...</div>
                  ) : history.length === 0 ? (
                    <div className="text-xs text-white/40">No queries yet</div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => loadFromHistory(msg)}
                          className="liquid-glass w-full text-left rounded-2xl p-3 text-xs text-white/80 transition-transform hover:scale-[1.02]"
                        >
                          <div className="truncate">{msg.question}</div>
                          <div className="mt-1 text-[10px] text-white/40">
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleDateString()
                              : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="liquid-glass mb-6 flex h-16 w-16 items-center justify-center rounded-full">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-3xl font-medium tracking-[-0.03em] text-white">
                    Ask anything
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-white/60">
                    Search the web with AI-powered answers and cited sources.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="liquid-glass-strong rounded-3xl p-6">
                    {/* Question */}
                    <div className="liquid-glass flex items-center gap-3 rounded-full px-4 py-3 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <Search className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="flex-1 text-sm text-white">{msg.question}</span>
                    </div>

                    {/* Sources */}
                    {msg.sources.length > 0 && (
                      <div className="mb-4">
                        <div className="mb-2 text-xs uppercase tracking-widest text-white/50">
                          Sources · {msg.sources.length}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((s, i) => (
                            <a
                              key={i}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="liquid-glass group flex items-start gap-3 rounded-2xl p-3 transition-transform hover:scale-[1.02]"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-white">
                                {i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[10px] text-white/60">
                                  {new URL(s.url).hostname}
                                </div>
                                <div className="mt-0.5 line-clamp-2 text-xs text-white/90">
                                  {s.title}
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40 transition-colors group-hover:text-white/90" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Answer */}
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
                        <Sparkles className="h-3 w-3" />
                        <span>Answer</span>
                      </div>
                      <div className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap">
                        {msg.answer}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="liquid-glass-strong flex items-center gap-3 rounded-full px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <Search className="h-3.5 w-3.5 text-white" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="liquid-glass flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-30"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
