import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";

async function requireAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin") throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
  return user;
}

export const createUnifiedEvent = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    cves: v.array(v.string()),
    malware: v.array(v.string()),
    threatActors: v.array(v.string()),
    victims: v.array(v.string()),
    technologies: v.array(v.string()),
    countries: v.array(v.string()),
    industries: v.array(v.string()),
    articleIds: v.array(v.id("articles")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const eventId = await ctx.db.insert("unifiedEvents", {
      ...args,
      createdBy: user._id,
      updatedAt: new Date().toISOString(),
    });
    for (const articleId of args.articleIds) {
      await ctx.db.patch(articleId, { unifiedEventId: eventId });
    }
    return eventId;
  },
});

export const updateUnifiedEvent = mutation({
  args: {
    id: v.id("unifiedEvents"),
    title: v.string(),
    summary: v.string(),
    cves: v.array(v.string()),
    malware: v.array(v.string()),
    threatActors: v.array(v.string()),
    victims: v.array(v.string()),
    technologies: v.array(v.string()),
    countries: v.array(v.string()),
    industries: v.array(v.string()),
    articleIds: v.array(v.id("articles")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ message: "Event not found", code: "NOT_FOUND" });

    for (const oldId of existing.articleIds) {
      if (!fields.articleIds.includes(oldId)) {
        await ctx.db.patch(oldId, { unifiedEventId: undefined });
      }
    }
    for (const newId of fields.articleIds) {
      if (!existing.articleIds.includes(newId)) {
        await ctx.db.patch(newId, { unifiedEventId: id });
      }
    }

    await ctx.db.patch(id, { ...fields, updatedAt: new Date().toISOString() });
  },
});

export const deleteUnifiedEvent = mutation({
  args: { id: v.id("unifiedEvents") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new ConvexError({ message: "Event not found", code: "NOT_FOUND" });
    for (const articleId of event.articleIds) {
      await ctx.db.patch(articleId, { unifiedEventId: undefined });
    }
    await ctx.db.delete(args.id);
  },
});

export const listUnifiedEvents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unifiedEvents")
      .withIndex("by_updatedAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getUnifiedEventWithArticles = query({
  args: { id: v.id("unifiedEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;
    const articles = await Promise.all(event.articleIds.map(id => ctx.db.get(id)));
    return {
      ...event,
      articles: articles.filter((a): a is NonNullable<typeof a> => a !== null),
    };
  },
});

export const getUnmappedArticles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_enriched", q => q.eq("enriched", true))
      .take(args.limit ?? 200);
    return articles.filter(a => !a.unifiedEventId);
  },
});
