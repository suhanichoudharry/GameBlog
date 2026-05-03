import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Layers, ExternalLink, Clock, AlertTriangle, AlertCircle,
  Users, Cpu, Globe, Shield, Tag, ChevronDown, X,
  Building2, BookOpen, Newspaper, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const TAG_GROUPS = [
  { key: "cves" as const, label: "CVEs", icon: AlertTriangle, color: "text-red-400 bg-red-400/10 border-red-400/20" },
  { key: "malware" as const, label: "Malware", icon: AlertCircle, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { key: "threatActors" as const, label: "Threat Actors", icon: Users, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  { key: "victims" as const, label: "Targets", icon: Tag, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  { key: "technologies" as const, label: "Technologies", icon: Cpu, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  { key: "countries" as const, label: "Countries", icon: Globe, color: "text-green-400 bg-green-400/10 border-green-400/20" },
  { key: "industries" as const, label: "Industries", icon: Shield, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
];

const CAT_CONFIG = {
  government: { label: "Gov", icon: Building2, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  research: { label: "Research", icon: BookOpen, color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  news: { label: "News", icon: Newspaper, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
};

export default function UnifiedFeed() {
  const [selectedId, setSelectedId] = useState<Id<"unifiedEvents"> | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Unified Events</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Deduplicated, admin-curated intelligence events — one entry per real-world incident
          </p>
        </div>
      </div>

      <div className={cn("grid gap-4", selectedId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <EventList selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId && (
          <EventDetail eventId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}

function EventList({
  selectedId,
  onSelect,
}: {
  selectedId: Id<"unifiedEvents"> | null;
  onSelect: (id: Id<"unifiedEvents">) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.unifiedEvents.listUnifiedEvents,
    {},
    { initialNumItems: 20 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium text-foreground">No unified events yet</p>
        <p className="text-sm mt-1 max-w-xs mx-auto">
          Admins can create unified events from the Admin Panel to merge related articles into a single clean entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map(event => (
        <EventCard
          key={event._id}
          event={event}
          isSelected={selectedId === event._id}
          onSelect={() => onSelect(event._id)}
        />
      ))}
      {status === "CanLoadMore" && (
        <div className="text-center pt-2">
          <Button variant="secondary" size="sm" onClick={() => loadMore(20)}>
            <ChevronDown className="w-4 h-4 mr-1.5" /> Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  isSelected,
  onSelect,
}: {
  event: Doc<"unifiedEvents">;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const time = (() => {
    try { return formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  const topTags = [
    ...(event.cves).map(t => ({ t, color: "text-red-400 bg-red-400/10 border-red-400/20" })),
    ...(event.malware).map(t => ({ t, color: "text-orange-400 bg-orange-400/10 border-orange-400/20" })),
    ...(event.threatActors).map(t => ({ t, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" })),
    ...(event.technologies).map(t => ({ t, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" })),
  ].slice(0, 6);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border p-4 space-y-3 transition-all cursor-pointer",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-primary bg-primary/10 border-primary/20 flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" />
          Unified Event
        </span>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">
          {event.articleIds.length} source{event.articleIds.length !== 1 ? "s" : ""}
        </span>
        {time && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />{time}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-sm leading-snug">{event.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{event.summary}</p>

      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topTags.map(({ t, color }, i) => (
            <span key={i} className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", color)}>
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function EventDetail({ eventId, onClose }: { eventId: Id<"unifiedEvents">; onClose: () => void }) {
  const data = useQuery(api.unifiedEvents.getUnifiedEventWithArticles, { id: eventId });

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    );
  }

  const time = (() => {
    try { return formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  return (
    <div className="rounded-xl border border-primary/30 bg-card overflow-hidden flex flex-col" style={{ maxHeight: 700 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-primary/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-primary">Unified Event</span>
          <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
            {data.articleIds.length} sources merged
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-auto flex-1 px-5 py-5 space-y-5">
        {/* Title & summary */}
        <div className="space-y-2">
          <h2 className="font-bold text-base leading-snug">{data.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
          {time && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last updated {time}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Extracted Intelligence</div>
          {TAG_GROUPS.map(group => {
            const tags = data[group.key];
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

        {/* Merged sources */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Merged Sources ({data.articles.length})
          </div>
          <div className="space-y-2">
            {data.articles.map(article => {
              const cfg = CAT_CONFIG[article.sourceCategory];
              return (
                <div key={article._id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <cfg.icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", cfg.color.split(" ")[0])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{article.aiTitle ?? article.originalTitle}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{article.sourceName}</p>
                  </div>
                  <a
                    href={article.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
