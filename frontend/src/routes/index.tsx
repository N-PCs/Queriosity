import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Wand2,
  BookOpen,
  Twitter,
  Linkedin,
  Instagram,
  Search,
  Plus,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import heroThumb from "@/assets/hero-thumb.jpg";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queriosity — Ask anything, get cited answers" },
      {
        name: "description",
        content:
          "Queriosity is an AI-powered answer engine that searches the web and returns concise, cited responses for your toughest questions.",
      },
      { property: "og:title", content: "Queriosity — Ask anything, get cited answers" },
      {
        property: "og:description",
        content:
          "AI-powered answer engine. Real-time web search, cited sources, and clear summaries.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen w-full">

      {/* Two-panel split */}
      <main className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <section className="relative w-full lg:w-[52%]">
          <div className="liquid-glass-strong absolute inset-4 rounded-3xl lg:inset-6" />

          <div className="relative flex min-h-screen flex-col p-8 lg:p-12">
            {/* Nav */}
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-2xl font-semibold tracking-tighter text-white">
                  queriosity
                </span>
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      to="/chat"
                      className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Sign in</span>
                    </Link>
                    <Link
                      to="/signup"
                      className="liquid-glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white transition-transform hover:scale-105"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Get started</span>
                    </Link>
                  </>
                )}
              </div>
            </nav>

            {/* Hero center */}
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="liquid-glass mb-8 flex h-20 w-20 items-center justify-center rounded-full">
                <Sparkles className="h-9 w-9 text-white" />
              </div>

              <h1 className="max-w-2xl text-4xl sm:text-5xl font-medium tracking-[-0.05em] text-white lg:text-7xl">
                Curiosity, <em className="font-serif italic text-white/80">answered</em> instantly
              </h1>

              <p className="mt-6 max-w-md text-sm text-white/60">
                The AI answer engine that searches the live web and replies with concise,
                source-cited summaries.
              </p>

              {/* Search-style CTA */}
              {user ? (
                <Link
                  to="/chat"
                  className="liquid-glass-strong mt-8 flex items-center gap-3 rounded-full px-3 py-3 pr-6 text-sm text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                    <Search className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span>Ask anything</span>
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="liquid-glass-strong mt-8 flex items-center gap-3 rounded-full px-3 py-3 pr-6 text-sm text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span>Start asking</span>
                </Link>
              )}

              {/* Pills */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {["Web Search", "Deep Research", "Cited Sources"].map((label) => (
                  <span
                    key={label}
                    className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom quote */}
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-white/50">
                Built for the curious
              </div>
              <p className="mx-auto mt-3 max-w-md text-lg text-white/80">
                <span className="font-sans">"We don't search for answers,</span>{" "}
                <span className="font-serif italic text-white">we follow questions."</span>
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 text-[10px] tracking-widest text-white/50">
                <span className="h-px w-12 bg-white/20" />
                <span>MARCUS AURELIO</span>
                <span className="h-px w-12 bg-white/20" />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className="relative hidden w-[48%] lg:flex">
          <div className="relative flex w-full flex-col p-6 lg:p-8">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="liquid-glass flex items-center gap-3 rounded-full px-4 py-2">
                <a href="#" className="text-white transition-colors hover:text-white/80">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-white transition-colors hover:text-white/80">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="#" className="text-white transition-colors hover:text-white/80">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
              {user ? (
                <Link
                  to="/chat"
                  className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Chat</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-transform hover:scale-105"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Account</span>
                </Link>
              )}
            </div>

            {/* Bottom feature section */}
            <div className="liquid-glass mt-auto rounded-[2.5rem] p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="liquid-glass rounded-3xl p-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Wand2 className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="mt-4 text-sm font-medium text-white">Reasoning</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Multi-step thinking across sources for sharper answers.
                  </p>
                </div>
                <div className="liquid-glass rounded-3xl p-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="mt-4 text-sm font-medium text-white">Library</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Every thread saved, searchable and revisitable forever.
                  </p>
                </div>
              </div>

              <div className="liquid-glass mt-3 flex items-center gap-4 rounded-3xl p-3">
                <img
                  src={heroThumb}
                  alt=""
                  width={96}
                  height={64}
                  loading="lazy"
                  className="h-16 w-24 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">Real-time citations</h4>
                  <p className="mt-0.5 text-xs text-white/60">
                    Every claim linked to the source — verify in one click.
                  </p>
                </div>
                <button className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Sample results preview */}
      <ResultsPreview />
    </div>
  );
}

type Citation = { n: number; title: string; source: string; url: string };

const sampleQuery = "How does retrieval-augmented generation actually work?";

const citations: Citation[] = [
  {
    n: 1,
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    source: "arxiv.org",
    url: "https://arxiv.org/abs/2005.11401",
  },
  {
    n: 2,
    title: "What is RAG? — Retrieval-Augmented Generation Explained",
    source: "nvidia.com",
    url: "https://blogs.nvidia.com/blog/what-is-retrieval-augmented-generation/",
  },
  {
    n: 3,
    title: "Retrieval Augmented Generation (RAG)",
    source: "huggingface.co",
    url: "https://huggingface.co/docs/transformers/model_doc/rag",
  },
  {
    n: 4,
    title: "Building RAG-based LLM Applications for Production",
    source: "anyscale.com",
    url: "https://www.anyscale.com/blog/a-comprehensive-guide-for-building-rag-based-llm-applications-part-1",
  },
];

function Cite({ n }: { n: number }) {
  const c = citations.find((x) => x.n === n);
  if (!c) return null;
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${c.title} — ${c.source}`}
      className="liquid-glass mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-text-top text-[10px] font-medium text-white/90 transition-transform hover:scale-110"
    >
      {n}
    </a>
  );
}

function ResultsPreview() {
  return (
    <section className="relative z-10 px-4 pb-16 pt-8 lg:px-12 lg:pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/50">Sample answer</div>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-white lg:text-4xl">
              See <em className="font-serif italic text-white/80">how</em> Queriosity answers
            </h2>
          </div>
        </div>

        <div className="liquid-glass-strong rounded-3xl p-6 lg:p-8">
          {/* Query bar */}
          <div className="liquid-glass flex items-center gap-3 rounded-full px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
              <Search className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="flex-1 truncate text-sm text-white">{sampleQuery}</span>
            <span className="liquid-glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest text-white/70">
              Deep
            </span>
          </div>

          {/* Sources row */}
          <div className="mt-6">
            <div className="mb-3 text-xs uppercase tracking-widest text-white/50">
              Sources · {citations.length}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {citations.map((c) => (
                <a
                  key={c.n}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass group flex items-start gap-3 rounded-2xl p-3 transition-transform hover:scale-[1.02]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-white">
                    {c.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-white/60">{c.source}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-white/90">{c.title}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40 transition-colors group-hover:text-white/90" />
                </a>
              ))}
            </div>
          </div>

          {/* Answer */}
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
              <Sparkles className="h-3 w-3" />
              <span>Answer</span>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-white/85">
              <p>
                Retrieval-augmented generation pairs a language model with an external knowledge
                store so answers stay grounded in real, verifiable text rather than the model's
                parametric memory alone<Cite n={1} />.
              </p>
              <p>
                At query time the system embeds your question, runs a vector search over an indexed
                corpus, and selects the top passages most relevant to the prompt<Cite n={3} />. Those
                passages are concatenated into the model's context window alongside the original
                question.
              </p>
              <p>
                The LLM then generates a response conditioned on the retrieved evidence, which
                reduces hallucination, makes citation possible, and lets the underlying knowledge be
                updated without retraining<Cite n={2} /><Cite n={4} />.
              </p>
            </div>
          </div>

          {/* Follow-ups */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="mb-3 text-xs uppercase tracking-widest text-white/50">
              Related questions
            </div>
            <div className="flex flex-col gap-2">
              {[
                "What's the difference between RAG and fine-tuning?",
                "Which vector databases work best for production RAG?",
                "How do I evaluate the quality of a RAG pipeline?",
              ].map((q) => (
                <button
                  key={q}
                  className="liquid-glass group flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-white/85 transition-transform hover:scale-[1.01]"
                >
                  <span>{q}</span>
                  <Plus className="h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
