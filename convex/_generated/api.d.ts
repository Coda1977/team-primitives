/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiInternal from "../aiInternal.js";
import type * as ai_chatRefine from "../ai/chatRefine.js";
import type * as ai_generateCanvas from "../ai/generateCanvas.js";
import type * as ai_synthesize from "../ai/synthesize.js";
import type * as canvas from "../canvas.js";
import type * as intake from "../intake.js";
import type * as lib_anthropic from "../lib/anthropic.js";
import type * as lib_ids from "../lib/ids.js";
import type * as ownerQueries from "../ownerQueries.js";
import type * as participants from "../participants.js";
import type * as sessions from "../sessions.js";
import type * as synthesis from "../synthesis.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiInternal: typeof aiInternal;
  "ai/chatRefine": typeof ai_chatRefine;
  "ai/generateCanvas": typeof ai_generateCanvas;
  "ai/synthesize": typeof ai_synthesize;
  canvas: typeof canvas;
  intake: typeof intake;
  "lib/anthropic": typeof lib_anthropic;
  "lib/ids": typeof lib_ids;
  ownerQueries: typeof ownerQueries;
  participants: typeof participants;
  sessions: typeof sessions;
  synthesis: typeof synthesis;
  votes: typeof votes;
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
