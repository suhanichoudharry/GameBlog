import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()), // "admin" | "user"
  }).index("by_token", ["tokenIdentifier"]),

  // Raw ingested articles from RSS/web sources
  articles: defineTable({
    // Source metadata
    sourceId: v.id("sources"),
    sourceName: v.string(),
    sourceCategory: v.union(v.literal("government"), v.literal("research"), v.literal("news")),
    originalUrl: v.string(),
    originalTitle: v.string(),
    originalContent: v.optional(v.string()),
    publishedAt: v.string(), // ISO 8601

    // AI enrichment status
    enriched: v.boolean(),

    // AI-generated fields
    aiTitle: v.optional(v.string()),
    aiSummary: v.optional(v.string()),

    // Extracted tags
    cves: v.optional(v.array(v.string())),
    malware: v.optional(v.array(v.string())),
    threatActors: v.optional(v.array(v.string())),
    victims: v.optional(v.array(v.string())),
    technologies: v.optional(v.array(v.string())),
    countries: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),

    // Deduplication
    unifiedEventId: v.optional(v.id("unifiedEvents")),
  })
    .index("by_source", ["sourceId"])
    .index("by_enriched", ["enriched"])
    .index("by_publishedAt", ["publishedAt"])
    .index("by_unified", ["unifiedEventId"])
    .searchIndex("search_all", {
      searchField: "aiTitle",
      filterFields: ["sourceCategory", "enriched"],
    }),

  // RSS/web sources
  sources: defineTable({
    name: v.string(),
    url: v.string(), // RSS feed URL
    category: v.union(v.literal("government"), v.literal("research"), v.literal("news")),
    enabled: v.boolean(),
    lastFetchedAt: v.optional(v.string()),
  }).index("by_category", ["category"]),

  // Deduplicated unified events (admin-curated)
  unifiedEvents: defineTable({
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
    createdBy: v.id("users"),
    updatedAt: v.string(),
  }).index("by_updatedAt", ["updatedAt"]),
});
