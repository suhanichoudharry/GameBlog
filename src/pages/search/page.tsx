import { useState, useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import {
  Search, X, ExternalLink, Clock, ChevronDown, Filter,
  AlertTriangle, AlertCircle, Users, Cpu, Globe, Shield,
  Building2, BookOpen, Newspaper, Tag, SlidersHorizontal,
  ChevronRight, CheckCircle2,
} from "lucide-react";

type Category = "government" | "research" | "news";

type Filters = {
  category?: Category;
  cve?: string;
  malware?: string;
  threatActor?: string;
  technology?: string;
  country?: string;
  industry?: string;
};

const CAT_CONFIG: Record<Category, { label: string; icon: typeof Building2; color: string }> = {
  government: { label: "Government", icon: Building2, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  research: { label: "Research", icon: BookOpen, color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  news: { label: "News", icon: Newspaper, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
};

const TAG_FIELDS = [
  { key: "cve" as const, label: "CVE", icon: AlertTriangle, color: "text-red-400", suggKey: "cves" as const },
  { key: "malware" as const, label: "Malware", icon: AlertCircle, color: "text-orange-400", suggKey: "malware" as const },
  { key: "threatActor" as const, label: "Threat Actor", icon: Users, color: "text-yellow-400", suggKey: "threatActors" as const },
  { key: "technology" as const, label: "Technology", icon: Cpu, color: "text-cyan-400", suggKey: "technologies" as const },
  { key: "country" as const, label: "Country", icon: Globe, color: "text-green-400", suggKey: "countries" as const },
  { key: "industry" as const, label: "Industry", icon: Shield, color: "text-purple-400", suggKey: "industries" as const },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Doc<"articles"> | null>(null);
  const [debouncedQuery] = useDebounce(query, 350);

  const suggestions = useQuery(api.articles.getTagSuggestions, {});

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = useCallback((key: keyof Filters) => {
    setFilters(prev => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const clearAll = useCallback(() => {
    setQuery("");
    setFilters({});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Search & Filter</h1>
        <p className="text-muted-foreground text-sm mt-1">Search across all intelligence entries by keyword or tag</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search titles, summaries, CVEs, malware, threat actors…"
          className="pl-10 pr-10 h-11 bg-card border-border text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter panel */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filters
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Category */}
              <FilterSection title="Source Category" icon={Filter}>
                <div className="space-y-1">
                  {(Object.entries(CAT_CONFIG) as [Category, typeof CAT_CONFIG[Category]][]).map(([cat, cfg]) => (
                    <button
                      key={cat}
                      onClick={() => setFilters(prev => ({ ...prev, category: prev.category === cat ? undefined : cat }))}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors text-left",
                        filters.category === cat
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <cfg.icon className="w-3.5 h-3.5 shrink-0" />
                      {cfg.label}
                      {filters.category === cat && <X className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Tag filters */}
              {TAG_FIELDS.map(field => (
                <TagFilterSection
                  key={field.key}
                  field={field}
                  value={filters[field.key]}
                  suggestions={suggestions?.[field.suggKey] ?? []}
                  onChange={val => setFilters(prev => ({ ...prev, [field.key]: val || undefined }))}
                  onClear={() => clearFilter(field.key)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <ActiveFilterChips filters={filters} onRemove={clearFilter} query={debouncedQuery} />
          <ResultsList
            query={debouncedQuery}
            filters={filters}
            selectedId={selectedArticle?._id}
            onSelect={setSelectedArticle}
          />
        </div>
      </div>

      {/* Article detail drawer (mobile/desktop overlay) */}
      {selectedArticle && (
        <ArticleDrawer article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </div>
  );
}

// ── Filter Section wrapper ─────────────────────────────────────────────────

function FilterSection({ title, icon: Icon, children }: { title: string; icon: typeof Filter; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Tag Filter Section ─────────────────────────────────────────────────────

function TagFilterSection({
  field,
  value,
  suggestions,
  onChange,
  onClear,
}: {
  field: typeof TAG_FIELDS[number];
  value?: string;
  suggestions: string[];
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [debouncedInput] = useDebounce(input, 200);

  const filtered = suggestions
    .filter(s => !debouncedInput || s.toLowerCase().includes(debouncedInput.toLowerCase()))
    .slice(0, 8);

  return (
    <FilterSection title={field.label} icon={field.icon}>
      {value ? (
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[11px] font-mono px-2 py-0.5 rounded border flex-1 truncate", `${field.color} bg-current/10 border-current/20`)}>
            {value}
          </span>
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={input}
            onChange={e => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={`Filter by ${field.label.toLowerCase()}…`}
            className="h-8 text-xs bg-card border-border"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
              {filtered.map(s => (
                <button
                  key={s}
                  onMouseDown={() => { onChange(s); setInput(""); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted cursor-pointer font-mono truncate"
                >
                  {s}
                </button>
              ))}
              {input && (
                <button
                  onMouseDown={() => { onChange(input); setInput(""); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted cursor-pointer text-primary border-t border-border"
                >
                  Search "{input}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </FilterSection>
  );
}

// ── Active filter chips ────────────────────────────────────────────────────

function ActiveFilterChips({ filters, onRemove, query }: { filters: Filters; onRemove: (k: keyof Filters) => void; query: string }) {
  const chips: { key: keyof Filters; label: string; color: string }[] = [];

  if (filters.category) chips.push({ key: "category", label: `Category: ${filters.category}`, color: "text-muted-foreground bg-muted border-border" });
  if (filters.cve) chips.push({ key: "cve", label: `CVE: ${filters.cve}`, color: "text-red-400 bg-red-400/10 border-red-400/20" });
  if (filters.malware) chips.push({ key: "malware", label: `Malware: ${filters.malware}`, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" });
  if (filters.threatActor) chips.push({ key: "threatActor", label: `Actor: ${filters.threatActor}`, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" });
  if (filters.technology) chips.push({ key: "technology", label: `Tech: ${filters.technology}`, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" });
  if (filters.country) chips.push({ key: "country", label: `Country: ${filters.country}`, color: "text-green-400 bg-green-400/10 border-green-400/20" });
  if (filters.industry) chips.push({ key: "industry", label: `Industry: ${filters.industry}`, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" });

  if (chips.length === 0 && !query) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {query && (
        <span className="text-xs px-2 py-0.5 rounded border font-mono text-primary bg-primary/10 border-primary/20 flex items-center gap-1">
          <Search className="w-3 h-3" /> {query}
        </span>
      )}
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className={cn("text-xs px-2 py-0.5 rounded border font-mono flex items-center gap-1 cursor-pointer hover:opacity-80", chip.color)}
        >
          {chip.label}
          <X className="w-2.5 h-2.5" />
        </button>
      ))}
    </div>
  );
}

// ── Results list ───────────────────────────────────────────────────────────

function ResultsList({
  query,
  filters,
  selectedId,
  onSelect,
}: {
  query: string;
  filters: Filters;
  selectedId?: string;
  onSelect: (a: Doc<"articles">) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.articles.searchArticles,
    {
      query,
      category: filters.category,
      cve: filters.cve,
      malware: filters.malware,
      threatActor: filters.threatActor,
      technology: filters.technology,
      country: filters.country,
      industry: filters.industry,
    },
    { initialNumItems: 25 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-foreground text-sm">No results found</p>
        <p className="text-xs mt-1">Try different keywords or remove some filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-3 font-mono">
        {results.length}{status === "CanLoadMore" ? "+" : ""} result{results.length !== 1 ? "s" : ""}
      </div>
      {results.map(article => (
        <SearchResultCard
          key={article._id}
          article={article}
          isSelected={selectedId === article._id}
          onSelect={() => onSelect(article)}
          searchQuery={query}
        />
      ))}
      {status === "CanLoadMore" && (
        <div className="pt-3 text-center">
          <Button variant="secondary" size="sm" onClick={() => loadMore(25)}>
            <ChevronDown className="w-4 h-4 mr-1.5" />
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Search result card ─────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  cves: "text-red-400 bg-red-400/10 border-red-400/20",
  malware: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  threatActors: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  victims: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  technologies: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  countries: "text-green-400 bg-green-400/10 border-green-400/20",
  industries: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

function SearchResultCard({
  article,
  isSelected,
  onSelect,
  searchQuery,
}: {
  article: Doc<"articles">;
  isSelected: boolean;
  onSelect: () => void;
  searchQuery: string;
}) {
  const cfg = CAT_CONFIG[article.sourceCategory];
  const title = article.aiTitle ?? article.originalTitle;
  const time = (() => {
    try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  const allTags = [
    ...(article.cves ?? []).map(t => ({ t, group: "cves" })),
    ...(article.malware ?? []).map(t => ({ t, group: "malware" })),
    ...(article.threatActors ?? []).map(t => ({ t, group: "threatActors" })),
    ...(article.technologies ?? []).map(t => ({ t, group: "technologies" })),
    ...(article.countries ?? []).map(t => ({ t, group: "countries" })),
    ...(article.industries ?? []).map(t => ({ t, group: "industries" })),
  ].slice(0, 6);

  // Highlight matching text
  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const re = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} className="bg-primary/25 text-primary rounded px-0.5">{p}</mark> : p
    );
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all cursor-pointer space-y-2",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1", cfg.color)}>
              <cfg.icon className="w-2.5 h-2.5" />
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground">{article.sourceName}</span>
            {article.enriched && <CheckCircle2 className="w-3 h-3 text-green-400" />}
            {time && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />{time}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-snug">
            {highlight(title)}
          </h3>

          {article.aiSummary && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {highlight(article.aiSummary)}
            </p>
          )}

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {allTags.map(({ t, group }, i) => (
                <span key={i} className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", TAG_COLORS[group])}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className={cn("w-4 h-4 shrink-0 mt-0.5 transition-colors", isSelected ? "text-primary" : "text-muted-foreground")} />
      </div>
    </button>
  );
}

// ── Article drawer ────────────────────────────────────────────────────────

const DRAWER_TAG_GROUPS = [
  { key: "cves" as const, label: "CVEs", icon: AlertTriangle, color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { key: "malware" as const, label: "Malware", icon: AlertCircle, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { key: "threatActors" as const, label: "Threat Actors", icon: Users, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  { key: "technologies" as const, label: "Technologies", icon: Cpu, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  { key: "countries" as const, label: "Countries", icon: Globe, color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { key: "industries" as const, label: "Industries", icon: Shield, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { key: "victims" as const, label: "Victims / Targets", icon: Tag, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
];

function ArticleDrawer({ article, onClose }: { article: Doc<"articles">; onClose: () => void }) {
  const cfg = CAT_CONFIG[article.sourceCategory];
  const time = (() => {
    try { return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1", cfg.color)}>
              <cfg.icon className="w-2.5 h-2.5" />{cfg.label}
            </span>
            <span className="text-xs text-muted-foreground">{article.sourceName}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 px-5 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              {article.enriched ? "AI Title" : "Original Title"}
            </div>
            <h2 className="font-bold text-base leading-snug">{article.aiTitle ?? article.originalTitle}</h2>
            {article.aiTitle && article.aiTitle !== article.originalTitle && (
              <p className="text-[11px] text-muted-foreground italic">Original: {article.originalTitle}</p>
            )}
          </div>

          {/* Summary */}
          {article.aiSummary && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">AI Summary</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{article.aiSummary}</p>
            </div>
          )}

          {/* Tags */}
          {article.enriched && (
            <div className="space-y-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Extracted Intelligence</div>
              {DRAWER_TAG_GROUPS.map(group => {
                const tags = article[group.key] ?? [];
                if (!tags.length) return null;
                return (
                  <div key={group.key} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <group.icon className="w-3 h-3" />{group.label}
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

          {/* Source info */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Source Transparency</div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{article.sourceName}</span>
              <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", cfg.color)}>{article.sourceCategory}</span>
            </div>
            {time && <div className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{time}</div>}
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer font-medium"
            >
              <ExternalLink className="w-3 h-3" /> View original source
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
