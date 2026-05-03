import { query } from "./_generated/server";
import { v } from "convex/values";

type TimeWindow = "24h" | "7d" | "30d" | "all";

function getStartTimestamp(window: TimeWindow): string | null {
  const now = new Date();
  if (window === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  if (window === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (window === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function rankTags(items: string[][]): { tag: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const list of items) {
    for (const tag of list) {
      const t = tag.trim();
      if (t) freq[t] = (freq[t] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export const getTrends = query({
  args: {
    window: v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const startTs = getStartTimestamp(args.window);

    // Only use enriched articles
    let articles = await ctx.db
      .query("articles")
      .withIndex("by_enriched", q => q.eq("enriched", true))
      .collect();

    if (startTs) {
      articles = articles.filter(a => a.publishedAt >= startTs);
    }

    const cves = rankTags(articles.map(a => a.cves ?? []));
    const malware = rankTags(articles.map(a => a.malware ?? []));
    const threatActors = rankTags(articles.map(a => a.threatActors ?? []));
    const technologies = rankTags(articles.map(a => a.technologies ?? []));
    const countries = rankTags(articles.map(a => a.countries ?? []));
    const industries = rankTags(articles.map(a => a.industries ?? []));
    const victims = rankTags(articles.map(a => a.victims ?? []));

    // Articles over time (by day, last N days)
    const days = args.window === "24h" ? 1
      : args.window === "7d" ? 7
      : args.window === "30d" ? 30
      : 30;

    const articlesByDay: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = articles.filter(a => a.publishedAt.slice(0, 10) === dateStr).length;
      articlesByDay.push({ date: dateStr, count });
    }

    return {
      totalArticles: articles.length,
      cves,
      malware,
      threatActors,
      technologies,
      countries,
      industries,
      victims,
      articlesByDay,
    };
  },
});

export const getSourceBreakdown = query({
  args: {
    window: v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const startTs = getStartTimestamp(args.window);
    let articles = await ctx.db.query("articles").collect();
    if (startTs) {
      articles = articles.filter(a => a.publishedAt >= startTs);
    }

    const byCategory: Record<string, number> = { government: 0, research: 0, news: 0 };
    const bySource: Record<string, number> = {};

    for (const a of articles) {
      byCategory[a.sourceCategory] = (byCategory[a.sourceCategory] ?? 0) + 1;
      bySource[a.sourceName] = (bySource[a.sourceName] ?? 0) + 1;
    }

    const topSources = Object.entries(bySource)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { byCategory, topSources, total: articles.length };
  },
});
