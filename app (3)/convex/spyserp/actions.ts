"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api.js";

const SPYSERP_API = "https://spyserp.com/panel/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type SpySerpResponse<T = unknown> = {
  status?: string;
  status_msg?: string;
  error?: string;
  data?: T;
  total?: number;
  project_id?: number;
  id?: number;
} & Record<string, unknown>;

type SpySerpStatRow = {
  keyword?: string;
  key_id?: number;
  position?: number | null;
  url?: string;
  date?: string;
  se?: number;
  domain?: string;
};

type SpySerpProject = {
  id: number;
  name: string;
  url?: string;
  status?: string;
};

// ── Delay — generous gap to avoid Cloudflare 1015 rate limiting ───────────────
// SpySERP uses Cloudflare; rapid bursts from the same server IP trigger error 1015.
// Use 1500ms between every call to stay well under the threshold.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DELAY = 1500; // ms between API calls — do NOT reduce below 1200ms

// ── Core request with 429/1015 retry ─────────────────────────────────────────

async function spySerpRequest<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  attempt = 0
): Promise<SpySerpResponse<T>> {
  const apiKey = process.env.SPYSERP_API_KEY;
  if (!apiKey) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "SPYSERP_API_KEY not set. Add it in Hercules → Advanced → Secrets.",
    });
  }
  const body = JSON.stringify({ method, token: apiKey, ...params });
  const res = await fetch(SPYSERP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  // Cloudflare rate limiting — back off and retry once
  if ((res.status === 429 || res.status === 503) && attempt === 0) {
    console.log(`[SpySERP] ${method} → rate limited (${res.status}), waiting 8s before retry`);
    await sleep(8000);
    return spySerpRequest<T>(method, params, 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ConvexError({
      code: "EXTERNAL_SERVICE_ERROR",
      message: `SpySERP API error (${res.status}) [${method}]: ${text.slice(0, 300)}`,
    });
  }
  const data = (await res.json()) as SpySerpResponse<T>;
  if (data.error) {
    throw new ConvexError({
      code: "EXTERNAL_SERVICE_ERROR",
      message: `SpySERP [${method}]: ${data.error}`,
    });
  }
  return data;
}

// Never throws — logs the failure and returns null
async function safeRequest<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<SpySerpResponse<T> | null> {
  try {
    return await spySerpRequest<T>(method, params);
  } catch (e) {
    const msg = e instanceof ConvexError
      ? String((e.data as Record<string, unknown>).message ?? e)
      : String(e);
    console.log(`[SpySERP] ${method} → FAILED: ${msg.slice(0, 200)}`);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase().replace(/^www\./, "");
}

function extractProjectId(res: SpySerpResponse): number | null {
  if (typeof res.project_id === "number") return res.project_id;
  if (typeof res.id === "number") return res.id;
  const d = res.data as Record<string, unknown> | undefined;
  if (d && typeof d.project_id === "number") return d.project_id as number;
  if (d && typeof d.id === "number") return d.id as number;
  return null;
}

function toList<T>(res: SpySerpResponse<T[]> | null): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.data)) return res.data;
  return [];
}

// ── SETUP PROJECT ─────────────────────────────────────────────────────────────
// Mirrors the 7-step SpySERP wizard exactly, with 1500ms between every API call
// to stay under Cloudflare's rate limit.
//
// 1. Create project (or find existing)
// 2. Add domain (is_own) + check it registered
// 3. Add keywords in batches of 50
// 4. Add Google Desktop search engine (se_id=1, no mobile)
// 5. Disable schedule (manual only)
// 6. Set owner — skip (API key owner is project owner by default)
// 7. Confirm and start project

export const setupProject = action({
  args: {
    projectId: v.id("projects"),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    spySerpProjectId: number;
    domainId: number;
    keywordsAdded: number;
    created: boolean;
    needsManualConfirm: boolean;
  }> => {
    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });

    const domain = normalizeDomain(project.websiteUrl);
    let spySerpProjectId = project.spySerpProjectId;
    let created = false;

    // ── Verify saved project still alive ─────────────────────────────────────
    if (spySerpProjectId) {
      await sleep(DELAY);
      const check = await safeRequest("project", { project_id: spySerpProjectId });
      const statusMsg = String(
        (check as Record<string, unknown> | null)?.status_msg ??
        (check as Record<string, unknown> | null)?.error ?? ""
      ).toLowerCase();

      if (check === null || statusMsg.includes("not exist")) {
        console.log(`[SpySERP] Saved project ${spySerpProjectId} is gone — will recreate`);
        await ctx.runMutation(api.projects.update, {
          projectId: args.projectId,
          spySerpProjectId: undefined,
          spySerpDomainId: undefined,
        });
        spySerpProjectId = undefined;
      } else {
        console.log(`[SpySERP] Project ${spySerpProjectId} alive: ${JSON.stringify(check)}`);
      }
    }

    // ── STEP 1: Create project ────────────────────────────────────────────────
    if (!spySerpProjectId) {
      const projectName = (project.name ?? domain).slice(0, 100);
      await sleep(DELAY);

      let createRes: SpySerpResponse | null = null;
      try {
        createRes = await spySerpRequest("projectCreate", { name: projectName });
        console.log(`[SpySERP] projectCreate → ${JSON.stringify(createRes)}`);
      } catch (e) {
        const msg = e instanceof ConvexError
          ? String((e.data as Record<string, unknown>).message ?? "")
          : String(e);
        console.log(`[SpySERP] projectCreate error: ${msg}`);

        // Name taken — find existing project by name
        await sleep(DELAY);
        const list = toList<SpySerpProject>(await safeRequest<SpySerpProject[]>("projects"));
        const match = list.find(
          (p) => p.name.trim().toLowerCase() === projectName.trim().toLowerCase()
        );
        if (match) {
          spySerpProjectId = match.id;
          console.log(`[SpySERP] Reusing existing project id=${match.id}`);
        } else {
          // Try with domain suffix to make name unique
          await sleep(DELAY);
          createRes = await spySerpRequest("projectCreate", {
            name: `${projectName} ${domain}`.slice(0, 100),
          });
        }
      }

      if (!spySerpProjectId && createRes) {
        const newId = extractProjectId(createRes);
        if (!newId) throw new ConvexError({
          code: "EXTERNAL_SERVICE_ERROR",
          message: "projectCreate returned no ID: " + JSON.stringify(createRes),
        });
        spySerpProjectId = newId;
        created = true;
        console.log(`[SpySERP] Created project id=${newId}`);
      }

      await ctx.runMutation(api.projects.update, {
        projectId: args.projectId,
        spySerpProjectId,
      });
    }

    // ── STEP 2: Add domain (own) ──────────────────────────────────────────────
    type DomainRow = { id?: number; domain_id?: number; rel_id?: number; domain?: string; name?: string; url?: string; is_own?: number };

    let domainId: number = project.spySerpDomainId ?? 0;

    if (!domainId) {
      // Helper: extract array from any response key SpySERP might use
      const extractList = <T>(raw: unknown): T[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw as T[];
        const obj = raw as Record<string, unknown>;
        // SpySERP uses "items" key for paginated lists
        for (const key of ["items", "data", "domains", "result", "list", "rows"]) {
          if (Array.isArray(obj[key])) return obj[key] as T[];
        }
        return [];
      };

      const fetchDomains = async (): Promise<DomainRow[]> => {
        // Try multiple param combos — SpySERP is inconsistent about pagination
        for (const params of [
          { project_id: spySerpProjectId },
          { project_id: spySerpProjectId, page: 1, pageSize: 50 },
          { project_id: spySerpProjectId, page: 1, per_page: 50 },
          { project_id: spySerpProjectId, limit: 50, offset: 0 },
        ]) {
          await sleep(DELAY);
          const raw = await safeRequest("projectDomains", params);
          console.log(`[SpySERP] projectDomains(${JSON.stringify(params)}) raw → ${JSON.stringify(raw)}`);
          const list = extractList<DomainRow>(raw);
          if (list.length > 0) return list;
        }
        return [];
      };

      const findMatch = (list: DomainRow[]) =>
        list.find((d) => {
          const dn = normalizeDomain(d.domain ?? d.name ?? d.url ?? "");
          return dn === domain || dn.includes(domain) || domain.includes(dn);
        });

      // Extract the numeric domain ID — SpySERP uses "domain_id" not "id"
      const getDomainId = (d: DomainRow): number =>
        d.domain_id ?? d.id ?? d.rel_id ?? 0;

      let existing = await fetchDomains();
      const already = findMatch(existing);
      if (already) {
        domainId = getDomainId(already);
        console.log(`[SpySERP] Domain already on project: domain_id=${domainId} raw=${JSON.stringify(already)}`);
      } else {
        // Try adding domain — "just exist" counts as success
        const formats: Array<{ domains: unknown }> = [
          { domains: [domain] },
          { domains: [{ domain, is_own: 1 }] },
          { domains: [`https://${domain}`] },
          { domains: [{ domain: `https://${domain}`, is_own: 1 }] },
        ];

        for (const fmt of formats) {
          await sleep(DELAY);
          // Use raw fetch to catch "just exist" as success
          let addOk = false;
          try {
            const r = await spySerpRequest("projectDomainsAdd", {
              project_id: spySerpProjectId,
              ...fmt,
            });
            console.log(`[SpySERP] projectDomainsAdd(${JSON.stringify(fmt)}) → ${JSON.stringify(r)}`);
            addOk = true;
          } catch (e) {
            const msg = e instanceof ConvexError
              ? String((e.data as Record<string, unknown>).message ?? "")
              : String(e);
            // "just exist" means it was already added — treat as success
            addOk = msg.toLowerCase().includes("just exist") || msg.toLowerCase().includes("exist");
            console.log(`[SpySERP] projectDomainsAdd(${JSON.stringify(fmt)}) → ${addOk ? "ALREADY EXISTS (ok)" : "FAILED: " + msg.slice(0, 120)}`);
          }
          if (addOk) break;
        }

        // Re-fetch to get the numeric ID
        existing = await fetchDomains();
        const matched = findMatch(existing);
        if (matched) {
          domainId = getDomainId(matched);
          console.log(`[SpySERP] Domain ID confirmed: domain_id=${domainId} raw=${JSON.stringify(matched)}`);
        } else {
          console.log(`[SpySERP] WARNING: projectDomains still empty after add — domain may need manual confirmation in SpySERP dashboard`);
        }
      }

      if (domainId > 0) {
        await ctx.runMutation(api.projects.update, {
          projectId: args.projectId,
          spySerpDomainId: domainId,
        });
      }
    }

    // ── STEP 3: Add keywords ──────────────────────────────────────────────────
    const keywords = await ctx.runQuery(api.keywords.queries.listAllForSync, {
      projectId: args.projectId,
    });

    let keywordsAdded = 0;
    const BATCH = 50;
    for (let i = 0; i < keywords.length; i += BATCH) {
      await sleep(DELAY);
      const batch = keywords.slice(i, i + BATCH).map((k) => k.keyword);
      const r = await safeRequest("projectKeywordsAdd", {
        project_id: spySerpProjectId,
        keywords: batch,
        skipFailed: 1,
      });
      console.log(`[SpySERP] projectKeywordsAdd batch[${i}..${i + batch.length - 1}] → ${JSON.stringify(r)}`);
      if (r !== null) keywordsAdded += batch.length;
    }

    // ── STEP 4: Add Google Desktop search engine (se_id=1, no mobile) ─────────
    // Google Desktop is se_id=1. SpySERP requires settings:{} in the payload.
    // "Added search engine just exist" is a success — engine already on project.
    await sleep(DELAY);
    const existingEnginesRaw = await safeRequest("projectSearchEngines", {
      project_id: spySerpProjectId,
    });
    console.log(`[SpySERP] projectSearchEngines raw → ${JSON.stringify(existingEnginesRaw)}`);

    // Check any response key for engines — SpySERP returns an object keyed by engine ID, not an array
    const enginesArr: Record<string, unknown>[] = (() => {
      if (!existingEnginesRaw) return [];
      if (Array.isArray(existingEnginesRaw)) return existingEnginesRaw as Record<string, unknown>[];
      const obj = existingEnginesRaw as Record<string, unknown>;
      // Check named array keys first
      for (const k of ["data", "engines", "items", "result", "list"]) {
        if (Array.isArray(obj[k])) return obj[k] as Record<string, unknown>[];
      }
      // SpySERP returns object keyed by numeric engine ID like { "28627": { se_id:1, ... } }
      return Object.values(obj).filter((v) => typeof v === "object" && v !== null) as Record<string, unknown>[];
    })();

    const hasGoogleDesktop = enginesArr.some((e) => {
      const name = String(e.name ?? e.title ?? "").toLowerCase();
      const seId = e.se_id ?? e.id;
      return (name.includes("google") && name.includes("desktop")) || seId === 1;
    });

    if (!hasGoogleDesktop) {
      await sleep(DELAY);
      try {
        const engineRes = await spySerpRequest("projectSearchEnginesAdd", {
          project_id: spySerpProjectId,
          engines: [{ se_id: 1, settings: {} }],
        });
        console.log(`[SpySERP] projectSearchEnginesAdd → ${JSON.stringify(engineRes)}`);
      } catch (e) {
        const msg = e instanceof ConvexError
          ? String((e.data as Record<string, unknown>).message ?? "")
          : String(e);
        const alreadyExists = msg.toLowerCase().includes("just exist") || msg.toLowerCase().includes("already exist");
        console.log(`[SpySERP] projectSearchEnginesAdd → ${alreadyExists ? "ALREADY EXISTS (ok)" : "FAILED: " + msg.slice(0, 120)}`);
      }
    } else {
      console.log(`[SpySERP] Google Desktop already added — skipping`);
    }

    // ── STEP 5: Disable schedule (manual only) ────────────────────────────────
    // SpySERP's schedule API methods all return "Bad method" (405) — they are
    // not exposed in the public API. The project will be started manually via
    // projectUpdate below. No action needed here.
    console.log(`[SpySERP] Step 5 (schedule): skipped — schedule API not available`);

    // ── STEP 6: Owner / users — skip ─────────────────────────────────────────
    // API key owner is already project owner. No API call needed.
    console.log(`[SpySERP] Step 6 (owner): skipped`);

    // ── STEP 7: Confirm and start project ────────────────────────────────────
    // SpySERP's wizard "CONFIRM AND START PROJECT" button does NOT call the
    // panel/api endpoint — it submits a separate form or fires a non-API request.
    // All probed API methods return 405 "Bad method".
    // Solution: save everything (domain, keywords, SE are all set), check if
    // the project is still in wizard state (disabled:2), and if so surface a
    // clear message asking the user to click Confirm once in SpySERP directly.
    // After that one manual click the project becomes active and all future
    // Sync SERP calls work with no manual steps needed.
    await sleep(DELAY);
    const projectStatus = await safeRequest("project", { project_id: spySerpProjectId });
    console.log(`[SpySERP] project final status → ${JSON.stringify(projectStatus)}`);

    const isDisabled = Number((projectStatus as Record<string, unknown> | null)?.disabled ?? 0) > 0;
    console.log(`[SpySERP] project disabled=${isDisabled} — setup ${isDisabled ? "needs manual confirm in SpySERP" : "complete"}`);

    if (isDisabled) {
      // Return a special flag so the frontend can show the manual confirm message
      return {
        spySerpProjectId: spySerpProjectId!,
        domainId,
        keywordsAdded,
        created,
        needsManualConfirm: true,
      };
    }

    console.log(
      `[SpySERP] Setup complete. project_id=${spySerpProjectId!} domain_id=${domainId} keywords=${keywordsAdded}`
    );
    return { spySerpProjectId: spySerpProjectId!, domainId, keywordsAdded, created, needsManualConfirm: false };
  },
});

// ── SYNC RANKINGS ─────────────────────────────────────────────────────────────

export const syncRankings = action({
  args: {
    projectId: v.id("projects"),
    spySerpProjectId: v.number(),
    seId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    synced: number;
    notFound: number;
    total: number;
  }> => {
    const keywords = await ctx.runQuery(api.keywords.queries.listAllForSync, {
      projectId: args.projectId,
    });
    if (keywords.length === 0) return { synced: 0, notFound: 0, total: 0 };

    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });

    const domainId = project.spySerpDomainId ?? 0;
    if (domainId === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          "No domain registered in SERP project yet. Click 'Sync SERP' first to complete setup, then sync again.",
      });
    }

    const today = new Date();
    const endDate = Math.floor(today.getTime() / 1000);
    const startDate = endDate - 86400 * 7;

    const statRows: SpySerpStatRow[] = [];
    let page = 1;
    while (true) {
      await sleep(page === 1 ? DELAY : DELAY);
      const statData = await spySerpRequest<SpySerpStatRow[]>("statistic", {
        project_id: args.spySerpProjectId,
        domain: domainId,
        se: args.seId ?? 0,
        show: "positions",
        start_date: startDate,
        end_date: endDate,
        category: -1,
        page,
        pageSize: 30,
        withLinks: 1,
      });
      const rows: SpySerpStatRow[] = Array.isArray(statData)
        ? (statData as SpySerpStatRow[])
        : ((statData.data as SpySerpStatRow[] | undefined) ?? []);
      statRows.push(...rows);
      console.log(`[SpySERP] statistic page=${page} → ${rows.length} rows`);
      if (rows.length < 30) break;
      page++;
      if (page > 50) break;
    }

    console.log(`[SpySERP] Total stat rows: ${statRows.length} for project ${args.spySerpProjectId}`);

    // Keep the most recent row per keyword
    const latestByKeyword = new Map<string, SpySerpStatRow>();
    for (const row of statRows) {
      const kw = (row.keyword ?? "").toLowerCase().trim();
      if (!kw) continue;
      const existing = latestByKeyword.get(kw);
      if (!existing || (row.date ?? "") > (existing.date ?? "")) {
        latestByKeyword.set(kw, row);
      }
    }

    const snapshotDate = new Date().toISOString().slice(0, 10);
    let synced = 0;
    let notFound = 0;

    for (const kw of keywords) {
      const row = latestByKeyword.get(kw.keyword.toLowerCase().trim());
      const position =
        row && row.position !== null && row.position !== undefined
          ? Number(row.position)
          : undefined;

      await ctx.runMutation(api.keywords.mutations.addRankSnapshot, {
        keywordId: kw._id,
        snapshotDate,
        position,
        url: row?.url ?? undefined,
        source: "spyserp",
        notes: `SpySERP project ${args.spySerpProjectId}`,
      });

      if (position !== undefined) synced++;
      else notFound++;
    }

    return { synced, notFound, total: keywords.length };
  },
});

// ── CHECK SINGLE KEYWORD ──────────────────────────────────────────────────────

export const checkKeywordRanking = action({
  args: {
    keywordId: v.id("keywords"),
    keyword: v.string(),
    spySerpProjectId: v.number(),
    targetDomain: v.string(),
    projectId: v.optional(v.id("projects")),
    seId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    position: number | null;
    url: string | null;
    checkedAt: string;
  }> => {
    let domainId = 0;
    if (args.projectId) {
      const proj = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
      domainId = proj?.spySerpDomainId ?? 0;
    }

    const today = new Date();
    const endDate = Math.floor(today.getTime() / 1000);
    const startDate = endDate - 86400 * 7;

    await sleep(DELAY);
    const statData = await spySerpRequest<SpySerpStatRow[]>("statistic", {
      project_id: args.spySerpProjectId,
      domain: domainId,
      se: args.seId ?? 0,
      show: "positions",
      start_date: startDate,
      end_date: endDate,
      search: args.keyword,
      category: -1,
      page: 1,
      pageSize: 30,
      withLinks: 1,
    });

    const rows: SpySerpStatRow[] = Array.isArray(statData)
      ? (statData as SpySerpStatRow[])
      : ((statData.data as SpySerpStatRow[] | undefined) ?? []);

    const kwLower = args.keyword.toLowerCase().trim();
    let best: SpySerpStatRow | undefined;
    for (const row of rows) {
      if ((row.keyword ?? "").toLowerCase().trim() !== kwLower) continue;
      if (!best || (row.date ?? "") > (best.date ?? "")) best = row;
    }

    const position =
      best && best.position !== null && best.position !== undefined
        ? Number(best.position)
        : null;

    const snapshotDate = new Date().toISOString().slice(0, 10);
    await ctx.runMutation(api.keywords.mutations.addRankSnapshot, {
      keywordId: args.keywordId,
      snapshotDate,
      position: position ?? undefined,
      url: best?.url ?? undefined,
      source: "spyserp",
      notes: `SpySERP project ${args.spySerpProjectId}`,
    });

    return { position, url: best?.url ?? null, checkedAt: new Date().toISOString() };
  },
});

// ── PUSH NEW KEYWORDS TO EXISTING PROJECT ─────────────────────────────────────

export const pushKeywords = action({
  args: {
    projectId: v.id("projects"),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ added: number }> => {
    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project?.spySerpProjectId) return { added: 0 };

    let added = 0;
    const BATCH = 50;
    for (let i = 0; i < args.keywords.length; i += BATCH) {
      await sleep(DELAY);
      const batch = args.keywords.slice(i, i + BATCH);
      const r = await safeRequest("projectKeywordsAdd", {
        project_id: project.spySerpProjectId,
        keywords: batch,
        skipFailed: 1,
      });
      if (r !== null) added += batch.length;
    }
    return { added };
  },
});

// ── DEBUG WIZARD: probe all possible schedule + confirm method names ───────────

export const debugWizardMethods = action({
  args: { spySerpProjectId: v.number() },
  handler: async (_ctx, args): Promise<Record<string, string>> => {
    const results: Record<string, string> = {};

    const probe = async (method: string, params: Record<string, unknown> = {}) => {
      await sleep(1200);
      try {
        const r = await spySerpRequest(method, { project_id: args.spySerpProjectId, ...params });
        results[method] = "SUCCESS: " + JSON.stringify(r).slice(0, 120);
      } catch (e) {
        const msg = e instanceof ConvexError
          ? String((e.data as Record<string, unknown>).message ?? e)
          : String(e);
        results[method] = "FAIL: " + msg.slice(0, 120);
      }
    };

    // Schedule methods (all return "Bad method" per testing — kept for documentation)
    await probe("projectSchedules", { page: 1, pageSize: 5 });

    // Enable/disable project
    await probe("projectUpdate", { disabled: 0 });
    await probe("projectUpdate", { disabled: 2 });

    // Confirm/activate methods
    await probe("projectConfirm");
    await probe("projectActivate");
    await probe("projectStart");

    // User/owner methods
    await probe("projectUsers");
    await probe("projectSharedEmails");

    console.log("[SpySERP] debugWizardMethods results:", JSON.stringify(results, null, 2));
    return results;
  },
});

// ── UTILITIES ─────────────────────────────────────────────────────────────────

export const getBalance = action({
  args: {},
  handler: async (_ctx, _args): Promise<unknown> => spySerpRequest("balance"),
});

export const listProjects = action({
  args: {},
  handler: async (_ctx, _args): Promise<SpySerpProject[]> => {
    const data = await spySerpRequest("projects");
    return toList<SpySerpProject>(data as SpySerpResponse<SpySerpProject[]>);
  },
});

export const searchLocations = action({
  args: { search: v.string() },
  handler: async (_ctx, args): Promise<Array<{ id: number; name: string }>> => {
    const data = await spySerpRequest("searchEnginesLoadSettings", {
      key: "google_location",
      search: args.search,
    });
    return toList<{ id: number; name: string }>(
      data as SpySerpResponse<Array<{ id: number; name: string }>>
    );
  },
});
