/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_queries from "../admin/queries.js";
import type * as admin_serpAdmin from "../admin/serpAdmin.js";
import type * as advanced_seo_actions from "../advanced_seo/actions.js";
import type * as advanced_seo_internalQueries from "../advanced_seo/internalQueries.js";
import type * as audits_actions from "../audits/actions.js";
import type * as audits_crawler from "../audits/crawler.js";
import type * as audits_internals from "../audits/internals.js";
import type * as audits_queries from "../audits/queries.js";
import type * as cms_actions from "../cms/actions.js";
import type * as cms_mutations from "../cms/mutations.js";
import type * as cms_queries from "../cms/queries.js";
import type * as config from "../config.js";
import type * as content_actions from "../content/actions.js";
import type * as content_mutations from "../content/mutations.js";
import type * as content_queries from "../content/queries.js";
import type * as dashboard_healthScores from "../dashboard/healthScores.js";
import type * as dashboard_topActions from "../dashboard/topActions.js";
import type * as ga4_actions from "../ga4/actions.js";
import type * as ga4_internalQueries from "../ga4/internalQueries.js";
import type * as ga4_mutations from "../ga4/mutations.js";
import type * as ga4_queries from "../ga4/queries.js";
import type * as gsc_actions from "../gsc/actions.js";
import type * as gsc_internalQueries from "../gsc/internalQueries.js";
import type * as gsc_mutations from "../gsc/mutations.js";
import type * as gsc_queries from "../gsc/queries.js";
import type * as http from "../http.js";
import type * as keyword_research_actions from "../keyword_research/actions.js";
import type * as keywords_actions from "../keywords/actions.js";
import type * as keywords_mutations from "../keywords/mutations.js";
import type * as keywords_queries from "../keywords/queries.js";
import type * as lib_auditRules from "../lib/auditRules.js";
import type * as lib_auth from "../lib/auth.js";
import type * as local_aeo_geo_actions from "../local_aeo_geo/actions.js";
import type * as monitoring_internalQueries from "../monitoring/internalQueries.js";
import type * as monitoring_mutations from "../monitoring/mutations.js";
import type * as monitoring_queries from "../monitoring/queries.js";
import type * as pagespeed_actions from "../pagespeed/actions.js";
import type * as pagespeed_mutations from "../pagespeed/mutations.js";
import type * as pagespeed_queries from "../pagespeed/queries.js";
import type * as projects from "../projects.js";
import type * as rankTracker_actions from "../rankTracker/actions.js";
import type * as schema_markup_actions from "../schema_markup/actions.js";
import type * as schema_markup_mutations from "../schema_markup/mutations.js";
import type * as schema_markup_queries from "../schema_markup/queries.js";
import type * as site_files_actions from "../site_files/actions.js";
import type * as spyserp_actions from "../spyserp/actions.js";
import type * as technical_seo_actions from "../technical_seo/actions.js";
import type * as technical_seo_queries from "../technical_seo/queries.js";
import type * as topic_map_mutations from "../topic_map/mutations.js";
import type * as topic_map_queries from "../topic_map/queries.js";
import type * as url_panel_actions from "../url_panel/actions.js";
import type * as url_removal_mutations from "../url_removal/mutations.js";
import type * as url_removal_queries from "../url_removal/queries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/queries": typeof admin_queries;
  "admin/serpAdmin": typeof admin_serpAdmin;
  "advanced_seo/actions": typeof advanced_seo_actions;
  "advanced_seo/internalQueries": typeof advanced_seo_internalQueries;
  "audits/actions": typeof audits_actions;
  "audits/crawler": typeof audits_crawler;
  "audits/internals": typeof audits_internals;
  "audits/queries": typeof audits_queries;
  "cms/actions": typeof cms_actions;
  "cms/mutations": typeof cms_mutations;
  "cms/queries": typeof cms_queries;
  config: typeof config;
  "content/actions": typeof content_actions;
  "content/mutations": typeof content_mutations;
  "content/queries": typeof content_queries;
  "dashboard/healthScores": typeof dashboard_healthScores;
  "dashboard/topActions": typeof dashboard_topActions;
  "ga4/actions": typeof ga4_actions;
  "ga4/internalQueries": typeof ga4_internalQueries;
  "ga4/mutations": typeof ga4_mutations;
  "ga4/queries": typeof ga4_queries;
  "gsc/actions": typeof gsc_actions;
  "gsc/internalQueries": typeof gsc_internalQueries;
  "gsc/mutations": typeof gsc_mutations;
  "gsc/queries": typeof gsc_queries;
  http: typeof http;
  "keyword_research/actions": typeof keyword_research_actions;
  "keywords/actions": typeof keywords_actions;
  "keywords/mutations": typeof keywords_mutations;
  "keywords/queries": typeof keywords_queries;
  "lib/auditRules": typeof lib_auditRules;
  "lib/auth": typeof lib_auth;
  "local_aeo_geo/actions": typeof local_aeo_geo_actions;
  "monitoring/internalQueries": typeof monitoring_internalQueries;
  "monitoring/mutations": typeof monitoring_mutations;
  "monitoring/queries": typeof monitoring_queries;
  "pagespeed/actions": typeof pagespeed_actions;
  "pagespeed/mutations": typeof pagespeed_mutations;
  "pagespeed/queries": typeof pagespeed_queries;
  projects: typeof projects;
  "rankTracker/actions": typeof rankTracker_actions;
  "schema_markup/actions": typeof schema_markup_actions;
  "schema_markup/mutations": typeof schema_markup_mutations;
  "schema_markup/queries": typeof schema_markup_queries;
  "site_files/actions": typeof site_files_actions;
  "spyserp/actions": typeof spyserp_actions;
  "technical_seo/actions": typeof technical_seo_actions;
  "technical_seo/queries": typeof technical_seo_queries;
  "topic_map/mutations": typeof topic_map_mutations;
  "topic_map/queries": typeof topic_map_queries;
  "url_panel/actions": typeof url_panel_actions;
  "url_removal/mutations": typeof url_removal_mutations;
  "url_removal/queries": typeof url_removal_queries;
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
