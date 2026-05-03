import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Seed default sources
export const seedSources = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("sources").collect();
    if (existing.length > 0) return;

    const sources = [
      // Government
      { name: "CISA Alerts", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", category: "government" as const, enabled: true },
      { name: "NIST NVD", url: "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml", category: "government" as const, enabled: true },
      { name: "US-CERT", url: "https://www.cisa.gov/cybersecurity-advisories/alerts.xml", category: "government" as const, enabled: true },
      // Research Blogs
      { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "research" as const, enabled: true },
      { name: "Schneier on Security", url: "https://www.schneier.com/feed/atom/", category: "research" as const, enabled: true },
      { name: "Google Project Zero", url: "https://googleprojectzero.blogspot.com/feeds/posts/default", category: "research" as const, enabled: true },
      { name: "Talos Intelligence", url: "https://blog.talosintelligence.com/feeds/posts/default", category: "research" as const, enabled: true },
      { name: "Unit 42 (Palo Alto)", url: "https://unit42.paloaltonetworks.com/feed/", category: "research" as const, enabled: true },
      // News
      { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "news" as const, enabled: true },
      { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", category: "news" as const, enabled: true },
      { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "news" as const, enabled: true },
      { name: "SecurityWeek", url: "https://feeds.feedburner.com/securityweek", category: "news" as const, enabled: true },
    ];

    for (const source of sources) {
      await ctx.db.insert("sources", { ...source, lastFetchedAt: undefined });
    }
  },
});

export const listSources = query({
  args: { category: v.optional(v.union(v.literal("government"), v.literal("research"), v.literal("news"))) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db.query("sources").withIndex("by_category", q => q.eq("category", args.category!)).collect();
    }
    return await ctx.db.query("sources").collect();
  },
});

export const toggleSource = mutation({
  args: { id: v.id("sources"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    await ctx.db.patch(args.id, { enabled: args.enabled });
  },
});
