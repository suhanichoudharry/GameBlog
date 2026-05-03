import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get pending (unenriched) articles for the enrichment queue UI
export const getPendingArticles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_enriched", q => q.eq("enriched", false))
      .take(args.limit ?? 50);
  },
});

// Manual re-enrichment of a specific article (admin)
export const resetEnrichment = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    await ctx.db.patch(args.id, {
      enriched: false,
      aiTitle: undefined,
      aiSummary: undefined,
      cves: undefined,
      malware: undefined,
      threatActors: undefined,
      victims: undefined,
      technologies: undefined,
      countries: undefined,
      industries: undefined,
    });
  },
});

// Manually edit enrichment data (admin)
export const editEnrichment = mutation({
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, enriched: true });
  },
});
