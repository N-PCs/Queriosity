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
  Settings,
  Plus,
} from "lucide-react";
import { z } from "zod";

const chatSearchSchema = z.object({
  history: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/chat")({
  validateSearch: (search) => chatSearchSchema.parse(search),
  component: ChatPage,
});

interface Message {
  id: string;
  question: string;
  answer: string;
  sources: { title: string; url: string; content: string; type?: string; list?: string[] }[];
  providerUsed?: "gemini" | "groq";
  created_at?: string;
}

const parseCitations = (text: string, sources: { title: string; url: string }[]) => {
  if (!sources || sources.length === 0) return [text];

  const regex = /\[(\d+)\]/g;
  const elements: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const citationNumber = parseInt(match[1], 10);

    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex));
    }

    if (citationNumber > 0 && citationNumber <= sources.length) {
      const source = sources[citationNumber - 1];
      let host = "";
      try {
        host = new URL(source.url).hostname;
      } catch {
        host = "source";
      }

      elements.push(
        <a
          key={`cite-${matchIndex}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${source.title} — ${host}`}
          className="liquid-glass mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-text-top text-[10px] font-medium text-white/90 transition-transform hover:scale-110"
        >
          {citationNumber}
        </a>
      );
    } else {
      elements.push(match[0]);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
};

const parseAnswerContent = (answer: string) => {
  const parts = answer.split(/related\s+questions:/i);
  const mainText = parts[0].trim();
  let relatedQuestions: string[] = [];

  if (parts[1]) {
    relatedQuestions = parts[1]
      .split("\n")
      .map((line) => line.replace(/^[\s\-\*\d\.\)]+/, "").trim())
      .filter((line) => line.length > 0 && (line.endsWith("?") || line.length > 5));
  }

  return { mainText, relatedQuestions };
};

const renderAnswerParagraphs = (mainText: string, sources: { title: string; url: string }[]) => {
  return mainText.split(/\n\n+/).map((para, idx) => {
    if (!para.trim()) return null;
    return (
      <p key={idx} className="mb-4 last:mb-0">
        {parseCitations(para, sources)}
      </p>
    );
  });
};

function ChatPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Settings state for custom Gemini & Groq API keys and provider
  const [showSettings, setShowSettings] = useState(false);
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [customGroqKey, setCustomGroqKey] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"auto" | "gemini" | "groq">("auto");

  // Guest trial warning modal state
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  useEffect(() => {
    setCustomGeminiKey(localStorage.getItem("queriosity_custom_gemini_key") || "");
    setCustomGroqKey(localStorage.getItem("queriosity_custom_groq_key") || "");
    setSelectedProvider(
      (localStorage.getItem("queriosity_ai_provider") as any) || "auto"
    );
  }, []);

  useEffect(() => {
    if (search.history === "true" || search.history === "1") {
      setShowHistory(true);
    }
  }, [search.history]);

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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (customGeminiKey.trim()) {
      localStorage.setItem("queriosity_custom_gemini_key", customGeminiKey.trim());
    } else {
      localStorage.removeItem("queriosity_custom_gemini_key");
    }

    if (customGroqKey.trim()) {
      localStorage.setItem("queriosity_custom_groq_key", customGroqKey.trim());
    } else {
      localStorage.removeItem("queriosity_custom_groq_key");
    }

    localStorage.setItem("queriosity_ai_provider", selectedProvider);
    setShowSettings(false);
  };

  const submitQuery = async (q: string) => {
    if (!q.trim() || loading) return;

    // Enforce 1 trial query limit for guest users (not signed in)
    if (!user) {
      const guestQueryCount = parseInt(
        localStorage.getItem("queriosity_guest_query_count") || "0",
        10
      );
      if (guestQueryCount >= 1) {
        setShowAuthRequired(true);
        return;
      }
    }

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
            ? { ...m, answer: res.answer, sources: res.sources, providerUsed: res.providerUsed }
            : m
        )
      );

      if (!user) {
        const guestQueryCount = parseInt(
          localStorage.getItem("queriosity_guest_query_count") || "0",
          10
        );
        localStorage.setItem("queriosity_guest_query_count", (guestQueryCount + 1).toString());
      } else {
        loadHistory();
      }
    } catch (err: any) {
      const isLimitReached = err.code === "LIMIT_REACHED" || err.status === 429;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                answer: isLimitReached
                  ? "Daily AI query limit reached. Please configure your own API key in settings (gear icon) to continue."
                  : `Error: ${err.message}`,
              }
            : m
        )
      );

      if (isLimitReached) {
        setShowSettings(true);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(query);
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
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col">
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Nav */}
        <nav className="flex items-center justify-between px-4 py-3 lg:px-10 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-semibold tracking-tighter text-white">
              queriosity
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Custom Gemini API Key Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="liquid-glass flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-transform hover:scale-105"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {user ? (
              <>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <button
                  onClick={logout}
                  className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  <span>Sign in</span>
                </Link>
                <Link
                  to="/signup"
                  className="liquid-glass-strong flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white transition-transform hover:scale-105"
                >
                  <span>Sign up</span>
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="flex flex-1 gap-0 lg:gap-6 px-4 lg:px-10 pb-4 overflow-hidden">
          {/* History sidebar — overlay on mobile, inline on desktop */}
          {showHistory && user && (
            <>
              {/* Backdrop (mobile only) */}
              <div
                className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                onClick={() => setShowHistory(false)}
              />
              <aside className="fixed inset-x-4 top-16 z-30 lg:static lg:inset-auto lg:z-auto lg:w-72 shrink-0">
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
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                  <div className="liquid-glass mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-white">
                    Ask anything
                  </h2>
                  <p className="mt-1.5 max-w-md text-xs sm:text-sm text-white/60">
                    Search the web with AI-powered answers and cited sources.
                  </p>
                  {!user && (
                    <div className="mt-3 text-[11px] text-white/40 border border-white/5 bg-white/5 px-3 py-1.5 rounded-full">
                      Guest Mode: You have 1 free trial query.
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="liquid-glass-strong rounded-3xl p-4 sm:p-6">
                    {/* Question */}
                    <div className="liquid-glass flex items-center gap-2 sm:gap-3 rounded-full px-3 py-2 sm:px-4 sm:py-3 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <Search className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="flex-1 text-xs sm:text-sm text-white">{msg.question}</span>
                    </div>

                    {(() => {
                      const rawSources = msg.sources || [];
                      const filteredSources = rawSources.filter((s) => s.type !== "images");
                      const imagesItem = rawSources.find((s) => s.type === "images");
                      const images = imagesItem ? (imagesItem.list || []) : [];
                      const { mainText, relatedQuestions } = parseAnswerContent(msg.answer);
                      const videoSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(msg.question)}`;

                      return (
                        <>
                          {/* Sources row */}
                          {filteredSources.length > 0 && (
                            <div className="mb-6">
                              <div className="mb-3 text-xs uppercase tracking-widest text-white/50">
                                Sources · {filteredSources.length}
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {filteredSources.map((s, i) => {
                                  let host = "";
                                  try {
                                    host = new URL(s.url).hostname;
                                  } catch {
                                    host = "source";
                                  }
                                  return (
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
                                        <div className="truncate text-xs text-white/60">{host}</div>
                                        <div className="mt-0.5 line-clamp-2 text-xs text-white/90">{s.title}</div>
                                      </div>
                                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40 transition-colors group-hover:text-white/90" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Answer */}
                          <div className="mt-6">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
                                <Sparkles className="h-3 w-3" />
                                <span>Answer</span>
                              </div>
                              {msg.providerUsed && (
                                <div className="text-[10px] text-white/50 border border-white/10 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                  {msg.providerUsed === "groq" ? "⚡ Groq (Llama 3.3)" : "✨ Gemini 2.5"}
                                </div>
                              )}
                            </div>
                            
                            {msg.answer === "Thinking..." ? (
                              <div className="flex items-center gap-2 text-xs text-white/50 animate-pulse py-2">
                                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                                <span>Thinking...</span>
                              </div>
                            ) : (
                              <div className="space-y-4 text-sm leading-relaxed text-white/85">
                                {renderAnswerParagraphs(mainText, filteredSources)}
                              </div>
                            )}
                          </div>

                          {/* Media Gallery (Visuals & Videos) */}
                          {msg.answer !== "Thinking..." && (images.length > 0 || msg.question) && (
                            <div className="mt-6 border-t border-white/10 pt-4">
                              <div className="mb-3 text-[10px] uppercase tracking-widest text-white/50">
                                Visuals & Videos
                              </div>
                              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                {images.map((imgUrl: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative h-24 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 group block"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Visual ${idx + 1}`}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </a>
                                ))}
                                {/* Youtube search shortcut card */}
                                <a
                                  href={videoSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative h-24 w-36 shrink-0 flex flex-col justify-between p-3 rounded-2xl border border-white/10 bg-red-950/20 hover:bg-red-900/20 transition-colors group"
                                >
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-red-500">
                                    <span className="text-[9px]">▶</span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[8px] uppercase tracking-widest text-red-400">YouTube</div>
                                    <div className="mt-0.5 truncate text-[10px] font-medium text-white/90">
                                      Watch videos
                                    </div>
                                  </div>
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Follow-ups */}
                          {msg.answer !== "Thinking..." && relatedQuestions.length > 0 && (
                            <div className="mt-6 border-t border-white/10 pt-4">
                              <div className="mb-3 text-xs uppercase tracking-widest text-white/50">
                                Related questions
                              </div>
                              <div className="flex flex-col gap-2">
                                {relatedQuestions.map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => submitQuery(q)}
                                    className="liquid-glass group flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-white/85 transition-transform hover:scale-[1.01]"
                                  >
                                    <span>{q}</span>
                                    <Plus className="h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>



            {/* Input */}
            <form onSubmit={handleSubmit} className="mt-2 shrink-0">
              <div className="liquid-glass-strong flex items-center gap-2 sm:gap-3 rounded-full px-3.5 py-2.5 sm:px-4 sm:py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <Search className="h-3.5 w-3.5 text-white" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-none"
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="liquid-glass-strong w-full max-w-md rounded-3xl p-6 border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-medium text-white mb-2">Settings</h3>
            <p className="text-xs text-white/60 mb-4 font-normal">
              Configure your API keys & preferred model provider. Custom keys bypass daily limit caps.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">AI Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as any)}
                  className="liquid-glass w-full rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-white/30 bg-black/40"
                >
                  <option value="auto" className="bg-neutral-900 text-white">Auto Fallback (Groq / Gemini)</option>
                  <option value="groq" className="bg-neutral-900 text-white">Groq (Ultra-Fast Llama 3.3)</option>
                  <option value="gemini" className="bg-neutral-900 text-white">Google Gemini 2.0</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Groq API Key</label>
                <input
                  type="password"
                  value={customGroqKey}
                  onChange={(e) => setCustomGroqKey(e.target.value)}
                  className="liquid-glass w-full rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
                  placeholder="Enter your Groq API key (gsk_...)"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Get a free key from{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-white"
                  >
                    Groq Console
                  </a>
                  .
                </span>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Gemini API Key</label>
                <input
                  type="password"
                  value={customGeminiKey}
                  onChange={(e) => setCustomGeminiKey(e.target.value)}
                  className="liquid-glass w-full rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
                  placeholder="Enter your Gemini API key (AIzaSy...)"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Get a free key from{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-white"
                  >
                    Google AI Studio
                  </a>
                  .
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="liquid-glass rounded-xl px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="liquid-glass-strong rounded-xl px-4 py-2 text-xs text-white transition-transform hover:scale-105"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Auth Required Warning Modal */}
      {showAuthRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="liquid-glass-strong w-full max-w-sm rounded-3xl p-6 text-center border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="liquid-glass mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Trial limit reached</h3>
            <p className="text-xs text-white/60 mb-6 font-normal">
              You've used your 1 free guest query. Please sign in or create an account to continue asking questions.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                to="/signup"
                className="liquid-glass-strong w-full rounded-xl py-2.5 text-xs font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Sign up for free
              </Link>
              <Link
                to="/login"
                className="liquid-glass w-full rounded-xl py-2.5 text-xs font-medium text-white/80 transition-transform hover:scale-[1.02]"
              >
                Sign in
              </Link>
              <button
                onClick={() => setShowAuthRequired(false)}
                className="text-[10px] text-white/40 hover:text-white mt-2 underline"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
