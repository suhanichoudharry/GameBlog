"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const EnrichmentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  cves: z.array(z.string()),
  malware: z.array(z.string()),
  threatActors: z.array(z.string()),
  victims: z.array(z.string()),
  technologies: z.array(z.string()),
  countries: z.array(z.string()),
  industries: z.array(z.string()),
});

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

// Enrich a batch of unenriched articles
export const enrichPendingArticles = action({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ enriched: number; failed: number }> => {
    const limit = args.batchSize ?? 5;
    const articles = await ctx.runQuery(internal.articles.getUnenrichedArticles, { limit });

    let enriched = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        const content = `Title: ${article.originalTitle}\n\nContent: ${article.originalContent ?? ""}`;
        const response = await openai.chat.completions.parse({
          model: "openai/gpt-5-mini",
          messages: [
            {
              role: "system",
              content: `You are a cybersecurity intelligence analyst. Given a cybersecurity article, extract structured threat intelligence.

Rules:
- Rewrite the title to be clearer and more informative (don't copy verbatim)
- Write a 2-3 sentence concise summary
- Extract CVE IDs (format: CVE-YYYY-NNNNN)
- Extract malware names (only confirmed malware families/tools)
- Extract threat actor names (APT groups, hacking groups)
- Extract victim organizations or sectors targeted
- Extract technology products/platforms mentioned
- Extract targeted countries
- Extract targeted industries
- Return empty arrays if nothing found, never null`,
            },
            { role: "user", content },
          ],
          response_format: zodResponseFormat(EnrichmentSchema, "enrichment"),
        });

        const data = response.choices[0]?.message?.parsed;
        if (!data) { failed++; continue; }

        await ctx.runMutation(internal.articles.updateEnrichment, {
          id: article._id,
          aiTitle: data.title,
          aiSummary: data.summary,
          cves: data.cves,
          malware: data.malware,
          threatActors: data.threatActors,
          victims: data.victims,
          technologies: data.technologies,
          countries: data.countries,
          industries: data.industries,
        });
        enriched++;
      } catch (e) {
        console.error(`Enrichment failed for ${article._id}:`, e);
        failed++;
      }
    }

    return { enriched, failed };
  },
});
