"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const enrichPendingArticles = action({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ enriched: number; failed: number }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Convex Dashboard.");

    const limit = args.batchSize ?? 1;
    const articles = await ctx.runQuery(internal.articles.getUnenrichedArticles, { limit });

    let enriched = 0;
    let failed = 0;

    // FIXED: Changed model name to gemini-1.5-flash-latest
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    for (const article of articles) {
      try {
        const prompt = `
You are a cybersecurity threat intelligence analyst.

Extract structured intelligence STRICTLY from the provided content.
DO NOT guess or hallucinate. If something is not explicitly mentioned, return an empty array.

INPUT:
Title: ${article.originalTitle}
Content: ${article.originalContent ?? ""}

TASK:
Return a valid JSON object with the following fields:

- title: A clean, concise rewritten title (string)
- summary: 2–3 sentence factual summary (string)
- cves: List of CVE IDs mentioned (e.g., CVE-2024-1234) (array of strings)
- malware: Malware families or tools mentioned (array of strings)
- threatActors: Named threat actors/groups (array of strings)
- victims: Specific organizations targeted (array of strings)
- technologies: Affected software, platforms, or systems (array of strings)
- countries: Targeted or origin countries (array of strings)
- industries: Targeted industries (array of strings)

RULES:
- ONLY extract what is explicitly present in the content
- DO NOT infer or assume
- DO NOT include explanations
- If nothing found → return empty array []
- Always return valid JSON (no markdown, no text outside JSON)

OUTPUT FORMAT:
{
  "title": "...",
  "summary": "...",
  "cves": [],
  "malware": [],
  "threatActors": [],
  "victims": [],
  "technologies": [],
  "countries": [],
  "industries": []
}
`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Google API Error ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        
        if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error("Invalid response structure from Gemini");
        }

        const aiText = result.candidates[0].content.parts[0].text;
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in AI response");
        const data = JSON.parse(jsonMatch[0]);

        await ctx.runMutation(internal.articles.updateEnrichment, {
          id: article._id,
          aiTitle: data.title || article.originalTitle,
          aiSummary: data.summary || "Summary generation failed.",
          cves: data.cves || [],
          malware: data.malware || [],
          threatActors: data.threatActors || [],
          victims: data.victims || [],
          technologies: data.technologies || [],
          countries: data.countries || [],
          industries: data.industries || [],
        });
        
        enriched++;
      } catch (e: any) {
        console.error(`Enrichment failed for ${article._id}:`, e.message);
        failed++;
      }
    }

    return { enriched, failed };
  },
});