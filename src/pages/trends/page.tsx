import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import {
  AlertTriangle, AlertCircle, Users, Globe, Cpu, Shield,
  TrendingUp, Newspaper, Building2, BookOpen, Tag, Rss, Search, Layers, ArrowRight
} from "lucide-react";

type TimeWindow = "24h" | "7d" | "30d" | "all";

const TIME_WINDOWS: { id: TimeWindow; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

const CHART_COLORS = {
  primary: "oklch(0.65 0.22 160)",
  blue: "oklch(0.65 0.18 220)",
  violet: "oklch(0.7 0.2 280)",
  amber: "oklch(0.7 0.2 50)",
  red: "oklch(0.65 0.22 25)",
  cyan: "oklch(0.7 0.18 200)",
  pink: "oklch(0.7 0.2 340)",
};

const CAT_COLORS: Record<string, string> = {
  government: CHART_COLORS.blue,
  research: CHART_COLORS.violet,
  news: CHART_COLORS.amber,
};

export default function TrendsPage() {
  const [window, setWindow] = useState<TimeWindow>("7d");
  const trends = useQuery(api.trends.getTrends, { window });
  const sources = useQuery(api.trends.getSourceBreakdown, { window });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">ThreatHub</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Real-time AI threat intelligence — frequency-ranked across all ingested sources
          </p>
        </div>
        <TimeFilter value={window} onChange={setWindow} />
      </div>

      {/* 3 Feature Quick-Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            to: "/feed",
            icon: Rss,
            label: "Intelligence Feed",
            description: "Fetch RSS sources and auto-enrich with AI in one click",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10 border-emerald-400/20 hover:border-emerald-400/50",
          },
          {
            to: "/search",
            icon: Search,
            label: "Search & Filter",
            description: "Search by keyword, CVE, malware, actor, country, or industry",
            color: "text-sky-400",
            bg: "bg-sky-400/10 border-sky-400/20 hover:border-sky-400/50",
          },
          {
            to: "/unified",
            icon: Layers,
            label: "Unified Events",
            description: "Deduplicated, merged intelligence events across all sources",
            color: "text-violet-400",
            bg: "bg-violet-400/10 border-violet-400/20 hover:border-violet-400/50",
          },
        ].map(f => (
          <Link
            key={f.to}
            to={f.to}
            className={cn(
              "group rounded-xl border p-4 flex flex-col gap-3 transition-all cursor-pointer",
              f.bg
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-background/50", f.color)}>
                <f.icon className="w-4 h-4" />
              </div>
              <ArrowRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0", f.color)} />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">{f.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.description}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Top stats */}
      <TopStats trends={trends} sources={sources} />

      {/* Activity over time + source pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={trends?.articlesByDay} window={window} />
        </div>
        <div>
          <SourcePieChart data={sources?.byCategory} total={sources?.total} />
        </div>
      </div>

      {/* Ranked tag groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TagRankCard
          title="Top CVEs"
          icon={AlertTriangle}
          color={CHART_COLORS.red}
          iconClass="text-red-400"
          data={trends?.cves}
        />
        <TagRankCard
          title="Top Malware"
          icon={AlertCircle}
          color={CHART_COLORS.amber}
          iconClass="text-orange-400"
          data={trends?.malware}
        />
        <TagRankCard
          title="Top Threat Actors"
          icon={Users}
          color={CHART_COLORS.violet}
          iconClass="text-yellow-400"
          data={trends?.threatActors}
        />
        <TagRankCard
          title="Top Technologies"
          icon={Cpu}
          color={CHART_COLORS.cyan}
          iconClass="text-cyan-400"
          data={trends?.technologies}
        />
        <TagRankCard
          title="Top Countries"
          icon={Globe}
          color={CHART_COLORS.primary}
          iconClass="text-green-400"
          data={trends?.countries}
        />
        <TagRankCard
          title="Top Industries"
          icon={Shield}
          color={CHART_COLORS.pink}
          iconClass="text-purple-400"
          data={trends?.industries}
        />
      </div>

      {/* Top sources bar chart */}
      <TopSourcesChart data={sources?.topSources} />
    </div>
  );
}

// ── Time Filter ───────────────────────────────────────────────────────────────

function TimeFilter({ value, onChange }: { value: TimeWindow; onChange: (w: TimeWindow) => void }) {
  return (
    <div className="flex gap-1 bg-secondary rounded-lg p-1">
      {TIME_WINDOWS.map(tw => (
        <button
          key={tw.id}
          onClick={() => onChange(tw.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
            value === tw.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tw.label}
        </button>
      ))}
    </div>
  );
}

// ── Top Stats ─────────────────────────────────────────────────────────────────

function TopStats({
  trends,
  sources,
}: {
  trends?: { totalArticles: number; cves: { tag: string; count: number }[]; malware: { tag: string; count: number }[]; threatActors: { tag: string; count: number }[] };
  sources?: { total: number };
}) {
  const items = [
    { label: "Enriched Articles", value: trends?.totalArticles, icon: TrendingUp, color: "text-primary" },
    { label: "Unique CVEs", value: trends?.cves.length, icon: AlertTriangle, color: "text-red-400" },
    { label: "Malware Families", value: trends?.malware.length, icon: AlertCircle, color: "text-orange-400" },
    { label: "Threat Actors", value: trends?.threatActors.length, icon: Users, color: "text-yellow-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(item => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
            {item.label}
          </div>
          {item.value === undefined
            ? <Skeleton className="h-7 w-16" />
            : <div className="text-2xl font-bold font-mono">{item.value}</div>
          }
        </div>
      ))}
    </div>
  );
}

// ── Activity Chart ────────────────────────────────────────────────────────────

function ActivityChart({ data, window }: { data?: { date: string; count: number }[]; window: TimeWindow }) {
  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    if (window === "24h") return date.toLocaleTimeString([], { hour: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Article Activity</span>
      </div>
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.02 240)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={formatDate}
              formatter={(v: number) => [v, "Articles"]}
            />
            <Area type="monotone" dataKey="count" stroke={CHART_COLORS.primary} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Source Pie ─────────────────────────────────────────────────────────────────

function SourcePieChart({ data, total }: { data?: Record<string, number>; total?: number }) {
  const entries = data
    ? Object.entries(data).map(([name, value]) => ({ name, value })).filter(e => e.value > 0)
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-full">
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">By Category</span>
      </div>
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : entries.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <div className="space-y-3">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={entries} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={3}>
                {entries.map((entry) => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] ?? CHART_COLORS.primary} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.02 240)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {entries.map(e => {
              const Icon = e.name === "government" ? Building2 : e.name === "research" ? BookOpen : Newspaper;
              const pct = total && total > 0 ? Math.round((e.value / total) * 100) : 0;
              return (
                <div key={e.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CAT_COLORS[e.name] }} />
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <span className="capitalize text-muted-foreground flex-1">{e.name}</span>
                  <span className="font-mono font-medium">{e.value}</span>
                  <span className="text-muted-foreground font-mono">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tag Rank Card ─────────────────────────────────────────────────────────────

type RankItem = { tag: string; count: number };

function TagRankCard({
  title,
  icon: Icon,
  color,
  iconClass,
  data,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  iconClass: string;
  data?: RankItem[];
}) {
  const max = data?.[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", iconClass)} />
        <span className="font-semibold text-sm">{title}</span>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs">No data for this period</div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 8).map((item, i) => (
            <div key={item.tag} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono truncate max-w-[160px]" title={item.tag}>{item.tag}</span>
                <span className="font-mono text-muted-foreground ml-2 shrink-0">{item.count}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.count / max) * 100}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top Sources Bar Chart ─────────────────────────────────────────────────────

function TopSourcesChart({ data }: { data?: { name: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Top Sources by Article Count</span>
      </div>
      {!data ? (
        <Skeleton className="h-48 w-full" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" horizontal vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.02 240)", borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: "oklch(0.22 0.02 240 / 0.5)" }}
              formatter={(v: number) => [v, "Articles"]}
            />
            <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
