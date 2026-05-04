import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";

export const getByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("originalUrl"), args.url))
      .first();
  },
});

export const insertArticle = internalMutation({
  args: {
    sourceId: v.id("sources"),
    sourceName: v.string(),
    sourceCategory: v.union(v.literal("government"), v.literal("research"), v.literal("news")),
    originalUrl: v.string(),
    originalTitle: v.string(),
    originalContent: v.optional(v.string()),
    publishedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("articles", {
      ...args,
      enriched: false,
    });
  },
});

export const markSourceFetched = internalMutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, { lastFetchedAt: new Date().toISOString() });
  },
});

export const listArticles = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.union(v.literal("government"), v.literal("research"), v.literal("news"))),
    enrichedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let q;

    if (args.category) {
      // Use the compound index: Filter by category, then sort by publishedAt
      q = ctx.db
        .query("articles")
        .withIndex("by_category_publishedAt", (q) => q.eq("sourceCategory", args.category!))
        .order("desc");
    } else {
      // "All" tab: Sort everything by date
      q = ctx.db
        .query("articles")
        .withIndex("by_publishedAt")
        .order("desc");
    }

    const result = await q.paginate(args.paginationOpts);

    if (args.enrichedOnly) {
      return {
        ...result,
        page: result.page.filter((a) => a.enriched),
      };
    }

    return result;
  },
});

export const getArticle = query({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUnenrichedArticles = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_enriched", q => q.eq("enriched", false))
      .take(args.limit);
  },
});

export const updateEnrichment = internalMutation({
  args: {
    id: v.id("articles"),
    aiTitle: v.string(),
    aiSummary: v.string(),
    cves: v.array(v.string()),
    malware: v.array(v.string()),
    threatActors: v.array(v.string()),
    victims: v.array(v.string()),
    technologies: v.array(v.string()),
    countries: v.array(v.string()),
    industries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, enriched: true });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("articles").collect();
    const enriched = all.filter(a => a.enriched).length;
    return { total: all.length, enriched, pending: all.length - enriched };
  },
});

export const deleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    await ctx.db.delete(args.id);
  },
});

export const searchArticles = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.union(v.literal("government"), v.literal("research"), v.literal("news"))),
    cve: v.optional(v.string()),
    malware: v.optional(v.string()),
    threatActor: v.optional(v.string()),
    technology: v.optional(v.string()),
    country: v.optional(v.string()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let baseResult;
    if (args.query.trim()) {
      baseResult = await ctx.db
        .query("articles")
        .withSearchIndex("search_all", q => q.search("aiTitle", args.query))
        .paginate(args.paginationOpts);
    } else {
      baseResult = await ctx.db
        .query("articles")
        .withIndex("by_publishedAt")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    let page = baseResult.page;
    if (args.category) page = page.filter(a => a.sourceCategory === args.category);
    if (args.cve) page = page.filter(a => (a.cves ?? []).some(t => t.toLowerCase().includes(args.cve!.toLowerCase())));
    if (args.malware) page = page.filter(a => (a.malware ?? []).some(t => t.toLowerCase().includes(args.malware!.toLowerCase())));
    if (args.threatActor) page = page.filter(a => (a.threatActors ?? []).some(t => t.toLowerCase().includes(args.threatActor!.toLowerCase())));
    if (args.technology) page = page.filter(a => (a.technologies ?? []).some(t => t.toLowerCase().includes(args.technology!.toLowerCase())));
    if (args.country) page = page.filter(a => (a.countries ?? []).some(t => t.toLowerCase().includes(args.country!.toLowerCase())));
    if (args.industry) page = page.filter(a => (a.industries ?? []).some(t => t.toLowerCase().includes(args.industry!.toLowerCase())));

    return { ...baseResult, page };
  },
});

export const getTagSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_enriched", q => q.eq("enriched", true))
      .take(500);

    const collect = (getter: (a: any) => string[] | undefined) => {
      const set = new Set<string>();
      for (const a of articles) { for (const t of getter(a) ?? []) set.add(t); }
      return [...set].sort();
    };

    return {
      cves: collect(a => a.cves),
      malware: collect(a => a.malware),
      threatActors: collect(a => a.threatActors),
      technologies: collect(a => a.technologies),
      countries: collect(a => a.countries),
      industries: collect(a => a.industries),
    };
  },
});

export const getArticlesByIds = query({
  args: { ids: v.array(v.id("articles")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(args.ids.map(id => ctx.db.get(id)));
    return results.filter((a): a is NonNullable<typeof a> => a !== null);
  },
});