import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import {
  Sparkles, RefreshCw, CheckCircle2, Clock, AlertCircle,
  ExternalLink, ChevronRight, Building2, BookOpen, Newspaper,
  Shield, Tag, Globe, Cpu, Users, AlertTriangle, X, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

export default function EnrichmentPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI Enrichment</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Process articles with AI to extract structured threat intelligence
        </p>
      </div>
      <EnrichmentDashboard />
    </div>
  );
}

function EnrichmentDashboard() {
  const stats = useQuery(api.articles.getStats, {});
  const [selectedArticle, setSelectedArticle] = useState<Doc<"articles"> | null>(null);

  return (
    <div className="space-y-6">
      <StatsBar stats={stats} />
      <EnrichmentControls />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingQueue onSelect={setSelectedArticle} selected={selectedArticle} />
        {selectedArticle
          ? <ArticleDetail article={selectedArticle} onClose={() => setSelectedArticle(null)} />
          : <EnrichmentGuide />
        }
      </div>
    </div>
  );
}

// ── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats?: { total: number; enriched: number; pending: number } }) {
  if (!stats) return <div className="grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  const pct = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;

  const items = [
    { label: "Total Articles", value: stats.total, icon: Shield, color: "text-primary" },
    { label: "Enriched", value: stats.enriched, icon: CheckCircle2, color: "text-green-400" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {items.map(item => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <item.icon className={cn("w-3.5 h-3.5", item.color)} />
              {item.label}
            </div>
            <div className="text-2xl font-bold font-mono">{item.value}</div>
          </div>
        ))}
      </div>
      {stats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Enrichment progress</span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enrichment Controls ──────────────────────────────────────────────────────

function EnrichmentControls() {
  const enrichAction = useAction(api.enrichment.enrichPendingArticles);
  const fetchAction = useAction(api.ingest.fetchAllSources);
  const seedSources = useMutation(api.sources.seedSources);
  const [enriching, setEnriching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const handleEnrich = async (batchSize: number) => {
    setEnriching(true);
    setBatchProgress({ done: 0, total: batchSize });
    try {
      const result = await enrichAction({ batchSize });
      setBatchProgress({ done: result.enriched, total: batchSize });
      if (result.enriched > 0) {
        toast.success(`Enriched ${result.enriched} article${result.enriched !== 1 ? "s" : ""} with AI`);
      } else {
        toast.info("No articles were enriched — queue may be empty or all failed");
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} article${result.failed !== 1 ? "s" : ""} failed enrichment`);
      }
    } catch (e) {
      toast.error("Enrichment failed");
    } finally {
      setEnriching(false);
      setTimeout(() => setBatchProgress(null), 3000);
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      await seedSources({});
      const result = await fetchAction({});
      toast.success(`Fetched ${result.fetched} new articles (${result.skipped} duplicates skipped)`);
    } catch {
      toast.error("Failed to fetch sources");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm">Enrichment Controls</h2>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button size="sm" onClick={handleFetch} disabled={fetching || enriching}>
          <RefreshCw className={cn("w-4 h-4 mr-1.5", fetching && "animate-spin")} />
          {fetching ? "Fetching..." : "Fetch New Articles"}
        </Button>

        <div className="flex gap-2">
          {[5, 10, 20].map(n => (
            <Button
              key={n}
              size="sm"
              disabled={enriching || fetching}
              onClick={() => handleEnrich(n)}
              className="font-mono"
            >
              <Sparkles className={cn("w-3.5 h-3.5 mr-1", enriching && "animate-pulse")} />
              Enrich ×{n}
            </Button>
          ))}
        </div>
      </div>

      {batchProgress && (
        <div className="flex items-center gap-3 text-sm">
          {enriching
            ? <><Sparkles className="w-4 h-4 text-primary animate-pulse" /><span className="text-muted-foreground">Processing batch with AI…</span></>
            : <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-muted-foreground">Batch complete: <span className="text-foreground font-medium">{batchProgress.done}/{batchProgress.total}</span> enriched</span></>
          }
        </div>
      )}
    </div>
  );
}

// ── Pending Queue ─────────────────────────────────────────────────────────────

const CAT_ICONS = {
  government: Building2,
  research: BookOpen,
  news: Newspaper,
};

const CAT_COLORS: Record<string, string> = {
  government: "text-blue-400",
  research: "text-violet-400",
  news: "text-amber-400",
};

function PendingQueue({
  onSelect,
  selected,
}: {
  onSelect: (a: Doc<"articles">) => void;
  selected: Doc<"articles"> | null;
}) {
  const pending = useQuery(api.enrichmentQueue.getPendingArticles, { limit: 30 });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm">Pending Queue</span>
        </div>
        {pending !== undefined && (
          <span className="text-xs font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">
            {pending.length} waiting
          </span>
        )}
      </div>

      <div className="overflow-auto flex-1">
        {pending === undefined && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}
        {pending?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <span>All articles enriched</span>
          </div>
        )}
        {pending?.map(article => {
          const Icon = CAT_ICONS[article.sourceCategory];
          const isSelected = selected?._id === article._id;
          return (
            <button
              key={article._id}
              onClick={() => onSelect(article)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors",
                isSelected ? "bg-primary/10" : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", CAT_COLORS[article.sourceCategory])} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">{article.originalTitle}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{article.sourceName}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Article Detail ────────────────────────────────────────────────────────────

const TAG_GROUPS = [
  { key: "cves" as const, label: "CVEs", icon: AlertTriangle, color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { key: "malware" as const, label: "Malware", icon: AlertCircle, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { key: "threatActors" as const, label: "Threat Actors", icon: Users, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  { key: "victims" as const, label: "Victims / Targets", icon: Tag, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  { key: "technologies" as const, label: "Technologies", icon: Cpu, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  { key: "countries" as const, label: "Countries", icon: Globe, color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { key: "industries" as const, label: "Industries", icon: Shield, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
];

function ArticleDetail({ article, onClose }: { article: Doc<"articles">; onClose: () => void }) {
  const resetEnrichment = useMutation(api.enrichmentQueue.resetEnrichment);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetEnrichment({ id: article._id });
      toast.success("Article queued for re-enrichment");
      onClose();
    } catch {
      toast.error("Failed to reset enrichment");
    } finally {
      setResetting(false);
    }
  };

  const time = (() => {
    try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {article.enriched
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <Clock className="w-4 h-4 text-amber-400" />
          }
          <span className="font-semibold text-sm">
            {article.enriched ? "Enriched Article" : "Pending Article"}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-auto flex-1 p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
            {article.enriched ? "AI-Generated Title" : "Original Title"}
          </div>
          <h3 className="font-semibold text-sm leading-snug">
            {article.aiTitle ?? article.originalTitle}
          </h3>
          {article.aiTitle && (
            <div className="text-[11px] text-muted-foreground italic">
              Original: {article.originalTitle}
            </div>
          )}
        </div>

        {/* Summary */}
        {article.aiSummary && (
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">AI Summary</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{article.aiSummary}</p>
          </div>
        )}

        {/* Tags */}
        {article.enriched && (
          <div className="space-y-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">Extracted Intelligence</div>
            {TAG_GROUPS.map(group => {
              const tags = article[group.key] ?? [];
              if (tags.length === 0) return null;
              return (
                <div key={group.key} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <group.icon className="w-3 h-3" />
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span key={i} className={cn("text-[11px] font-mono px-2 py-0.5 rounded border", group.color)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!article.enriched && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-muted-foreground">This article is waiting for AI enrichment. Use the controls above to process it.</span>
          </div>
        )}

        {/* Source metadata */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="text-muted-foreground uppercase tracking-wider font-mono text-[10px]">Source</div>
          <div className="flex items-center justify-between">
            <span className="font-medium">{article.sourceName}</span>
            <span className={cn(
              "px-2 py-0.5 rounded border font-mono",
              article.sourceCategory === "government" ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                : article.sourceCategory === "research" ? "text-violet-400 bg-violet-400/10 border-violet-400/20"
                : "text-amber-400 bg-amber-400/10 border-amber-400/20"
            )}>
              {article.sourceCategory}
            </span>
          </div>
          {time && <div className="text-muted-foreground">{time}</div>}
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" /> View original article
          </a>
        </div>
      </div>

      {/* Footer actions */}
      {article.enriched && (
        <div className="px-4 py-3 border-t border-border shrink-0 flex gap-2">
          <Button size="sm" variant="secondary" disabled={resetting} onClick={handleReset}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", resetting && "animate-spin")} />
            Re-enrich
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Guide (empty state) ───────────────────────────────────────────────────────

function EnrichmentGuide() {
  const steps = [
    { label: "Fetch Sources", desc: "Pull latest articles from all enabled RSS feeds" },
    { label: "Run Enrichment", desc: "AI rewrites titles, generates summaries, and extracts structured tags" },
    { label: "Review Results", desc: "Click any article in the queue to inspect extracted intelligence" },
    { label: "Re-enrich if needed", desc: "Reset and re-process any article from the detail panel" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">How Enrichment Works</span>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">
              {i + 1}
            </div>
            <div>
              <div className="text-sm font-medium">{step.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground text-[11px] uppercase tracking-wider font-mono">Extracted Tags</div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { icon: AlertTriangle, label: "CVEs", color: "text-red-400" },
            { icon: AlertCircle, label: "Malware families", color: "text-orange-400" },
            { icon: Users, label: "Threat actors", color: "text-yellow-400" },
            { icon: Tag, label: "Victim targets", color: "text-pink-400" },
            { icon: Cpu, label: "Technologies", color: "text-cyan-400" },
            { icon: Globe, label: "Countries", color: "text-green-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className={cn("w-3 h-3", color)} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
