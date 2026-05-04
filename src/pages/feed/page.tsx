"use node";

import { usePaginatedQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { 
  RefreshCw, Sparkles, ExternalLink, Clock, Building2, 
  BookOpen, Newspaper, ChevronDown, CheckCircle2, X 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Category = "all" | "government" | "research" | "news";

const CATEGORY_CONFIG = {
  government: { label: "Government", icon: Building2, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  research: { label: "Research", icon: BookOpen, color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  news: { label: "News", icon: Newspaper, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
};

export default function Feed() {
  const [category, setCategory] = useState<Category>("all");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Feed</h1>
          <p className="text-muted-foreground text-sm mt-1">Fetch sources and AI-enrich threat intelligence in one click</p>
        </div>
        <IngestControls />
      </div>

      <CategoryFilter value={category} onChange={setCategory} />

      <ArticleList category={category} />
    </div>
  );
}

function CategoryFilter({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  const tabs: { id: Category; label: string }[] = [
    { id: "all", label: "All Sources" },
    { id: "government", label: "Government" },
    { id: "research", label: "Research Blogs" },
    { id: "news", label: "News Sites" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border",
            value === tab.id
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type FetchEnrichStatus = "idle" | "fetching" | "enriching" | "done";

function IngestControls() {
  const fetchSources = useAction(api.ingest.fetchAllSources);
  const enrichArticles = useAction(api.enrichment.enrichPendingArticles);
  const seedSources = useMutation(api.sources.seedSources);
  const [status, setStatus] = useState<FetchEnrichStatus>("idle");

  const handleFetchAndEnrich = async () => {
    setStatus("fetching");
    try {
      await seedSources({});
      const fetchResult = await fetchSources({});
      const fetched = fetchResult.fetched;

      setStatus("enriching");
      const enrichResult = await enrichArticles({ batchSize: 10 });

      setStatus("done");
      toast.success(
        `Fetched ${fetched} new articles · Enriched ${enrichResult.enriched} with AI`,
        { icon: <Sparkles className="w-4 h-4 text-primary" /> }
      );

      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      toast.error("Failed to fetch or enrich articles");
      setStatus("idle");
    }
  };

  const isRunning = status === "fetching" || status === "enriching";

  const label = status === "fetching"
    ? "Fetching sources…"
    : status === "enriching"
    ? "Enriching with AI…"
    : status === "done"
    ? "Up to date"
    : "Fetch & Enrich";

  const Icon = status === "done" ? CheckCircle2 : status === "enriching" ? Sparkles : RefreshCw;

  return (
    <Button size="sm" onClick={handleFetchAndEnrich} disabled={isRunning} className="min-w-[160px]">
      <Icon className={cn("w-4 h-4 mr-1.5", status === "fetching" && "animate-spin", status === "enriching" && "animate-pulse")} />
      {label}
    </Button>
  );
}

function ArticleList({ category }: { category: Category }) {
  // State to handle the modal
  const [selectedArticle, setSelectedArticle] = useState<Doc<"articles"> | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.articles.listArticles,
    {
      category: category !== "all" ? category : undefined,
      enrichedOnly: false,
    },
    { initialNumItems: 20 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-4xl mb-4">📡</div>
        <p className="font-medium text-foreground">No articles yet</p>
        <p className="text-sm mt-1">Click "Fetch &amp; Enrich" to ingest and AI-analyze threat intelligence</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map(article => (
        <ArticleCard 
          key={article._id} 
          article={article} 
          onSelect={() => setSelectedArticle(article)} 
        />
      ))}
      
      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleModal 
          article={selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}

      {status === "CanLoadMore" && (
        <div className="text-center pt-4">
          <Button variant="secondary" onClick={() => loadMore(20)}>
            <ChevronDown className="w-4 h-4 mr-1.5" />
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, onSelect }: { article: Doc<"articles">; onSelect: () => void }) {
  const cfg = CATEGORY_CONFIG[article.sourceCategory];
  const title = article.aiTitle ?? article.originalTitle;
  const summary = article.aiSummary;
  const time = (() => {
    try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  const allTags = [
    ...(article.cves ?? []).map(t => ({ label: t, color: "text-red-400 bg-red-400/10 border-red-400/20" })),
    ...(article.malware ?? []).map(t => ({ label: t, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" })),
    ...(article.threatActors ?? []).map(t => ({ label: t, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" })),
    ...(article.victims ?? []).map(t => ({ label: `Victim: ${t}`, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" })),
    ...(article.technologies ?? []).map(t => ({ label: t, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" })),
    ...(article.countries ?? []).map(t => ({ label: t, color: "text-green-400 bg-green-400/10 border-green-400/20" })),
    ...(article.industries ?? []).map(t => ({ label: t, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" })),
  ].slice(0, 10);

  return (
    <div 
      onClick={onSelect}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80 cursor-pointer group",
        !article.enriched && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded border font-mono", cfg.color)}>
              <cfg.icon className="w-3 h-3 inline mr-1" />
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{article.sourceName}</span>
            {time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {time}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>

          {summary && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{summary}</p>
          )}

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allTags.map((tag, i) => (
                <span key={i} className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", tag.color)}>
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <a
          href={article.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent modal from opening when clicking link
          className="text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer mt-0.5"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {!article.enriched && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>Pending AI enrichment</span>
        </div>
      )}
    </div>
  );
}

function ArticleModal({ article, onClose }: { article: Doc<"articles">; onClose: () => void }) {
  const sections = [
    { title: "CVE IDs", data: article.cves, color: "text-red-400 bg-red-400/10 border-red-400/20" },
    { title: "Malware", data: article.malware, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    { title: "Threat Actors", data: article.threatActors, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    { title: "Targeted Victims", data: article.victims, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
    { title: "Technologies", data: article.technologies, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
    { title: "Countries", data: article.countries, color: "text-green-400 bg-green-400/10 border-green-400/20" },
    { title: "Industries", data: article.industries, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="space-y-6">
          <header className="space-y-2 pr-8">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-primary" />
              AI-Enriched Intelligence
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              {article.aiTitle || article.originalTitle}
            </h2>
          </header>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Summary
            </h3>
            <p className="text-base text-foreground leading-relaxed">
              {article.aiSummary || "No AI summary available for this entry."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map(section => (
              section.data && section.data.length > 0 && (
                <div key={section.title} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {section.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {section.data.map((item, idx) => (
                      <span key={idx} className={cn("text-[11px] font-mono px-2.5 py-1 rounded border", section.color)}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="pt-6 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Source: <span className="text-foreground font-medium">{article.sourceName}</span>
            </span>
            <Button size="sm" asChild variant="outline">
              <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
                View Original Source
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}