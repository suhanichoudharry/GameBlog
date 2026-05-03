"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import Parser from "rss-parser";

type RssItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  isoDate?: string;
};

// Fetch articles from all enabled sources
export const fetchAllSources = action({
  args: {},
  handler: async (ctx): Promise<{ fetched: number; skipped: number }> => {
    const sources = await ctx.runQuery(api.sources.listSources, {});
    const enabled = sources.filter((s) => s.enabled);

    let fetched = 0;
    let skipped = 0;

    for (const source of enabled) {
      try {
        const result = await ctx.runAction(internal.ingest.fetchSource, { sourceId: source._id });
        fetched += result.fetched;
        skipped += result.skipped;
      } catch (e) {
        console.error(`Failed to fetch ${source.name}:`, e);
      }
    }

    return { fetched, skipped };
  },
});

export const fetchSource = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args): Promise<{ fetched: number; skipped: number }> => {
    const source = await ctx.runQuery(api.sources.listSources, {});
    const src = source.find((s) => s._id === args.sourceId);
    if (!src) return { fetched: 0, skipped: 0 };

    const parser = new Parser({ timeout: 10000 });
    let feed;
    try {
      feed = await parser.parseURL(src.url);
    } catch (e) {
      console.error(`RSS parse failed for ${src.name}:`, e);
      return { fetched: 0, skipped: 0 };
    }

    const items: RssItem[] = (feed.items ?? []).slice(0, 20);
    let fetched = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.link || !item.title) { skipped++; continue; }

      const existing = await ctx.runQuery(internal.articles.getByUrl, { url: item.link });
      if (existing) { skipped++; continue; }

      const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
      const content = item.content ?? item.contentSnippet ?? "";

      await ctx.runMutation(internal.articles.insertArticle, {
        sourceId: src._id,
        sourceName: src.name,
        sourceCategory: src.category,
        originalUrl: item.link,
        originalTitle: item.title,
        originalContent: content.slice(0, 2000),
        publishedAt,
      });
      fetched++;
    }

    await ctx.runMutation(internal.articles.markSourceFetched, { sourceId: args.sourceId });
    return { fetched, skipped };
  },
});
