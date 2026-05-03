/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as enrichment from "../enrichment.js";
import type * as enrichmentQueue from "../enrichmentQueue.js";
import type * as ingest from "../ingest.js";
import type * as sources from "../sources.js";
import type * as trends from "../trends.js";
import type * as unifiedEvents from "../unifiedEvents.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  enrichment: typeof enrichment;
  enrichmentQueue: typeof enrichmentQueue;
  ingest: typeof ingest;
  sources: typeof sources;
  trends: typeof trends;
  unifiedEvents: typeof unifiedEvents;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
