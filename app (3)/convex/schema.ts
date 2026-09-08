import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    plan: v.optional(v.string()), // "free" | "pro" | "agency"
    planExpiresAt: v.optional(v.string()), // ISO 8601
    orgId: v.optional(v.id("organizations")),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    plan: v.string(), // "free" | "pro" | "agency"
    planExpiresAt: v.optional(v.string()),
    memberCount: v.number(),
    projectCount: v.number(),
    createdAt: v.string(),
  }).index("by_owner", ["ownerId"]),

  featureFlags: defineTable({
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    rolloutPercent: v.optional(v.number()), // 0-100
    enabledForRoles: v.optional(v.array(v.string())), // ["admin","pro"] etc
    updatedAt: v.string(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    websiteUrl: v.string(),
    websiteType: v.string(),
    businessName: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    secondaryLanguages: v.optional(v.array(v.string())),
    businessDescription: v.optional(v.string()),
    primaryServices: v.optional(v.string()),
    products: v.optional(v.string()),
    primaryAudience: v.optional(v.string()),
    primaryConversionGoal: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    gscPropertyUrl: v.optional(v.string()),
    ga4PropertyId: v.optional(v.string()),
    gbpStatus: v.optional(v.string()),
    pagespeedApiKey: v.optional(v.string()),
    // SpySERP integration: numeric project ID from SpySERP dashboard
    spySerpProjectId: v.optional(v.number()),
    spySerpDomainId: v.optional(v.number()),
    status: v.string(),
  }).index("by_user", ["userId"]),

  projectLocations: defineTable({
    projectId: v.id("projects"),
    country: v.string(),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    isPrimary: v.boolean(),
  }).index("by_project", ["projectId"]),

  // ── Site Audit tables ──────────────────────────────────────────

  audits: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    status: v.string(), // queued | crawling | paused | completed | cancelled | failed
    // Crawl configuration
    maxPages: v.number(),
    maxDepth: v.number(),
    includePaths: v.array(v.string()),
    excludePaths: v.array(v.string()),
    respectRobotsTxt: v.boolean(),
    robotsTxtContent: v.optional(v.string()),
    // Progress counters
    pagesCrawled: v.number(),
    pagesFound: v.number(),
    issuesFound: v.number(),
    criticalCount: v.number(),
    highCount: v.number(),
    mediumCount: v.number(),
    lowCount: v.number(),
    infoCount: v.number(),
    // Timestamps (ISO 8601 UTC)
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    // Computed after completion
    overallScore: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  auditPages: defineTable({
    auditId: v.id("audits"),
    url: v.string(),
    crawlStatus: v.string(), // queued | crawled | failed | skipped
    depth: v.number(),
    // Response data (populated after crawl)
    statusCode: v.optional(v.number()),
    redirectUrl: v.optional(v.string()),
    contentType: v.optional(v.string()),
    loadTimeMs: v.optional(v.number()),
    // Page analysis
    title: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    canonical: v.optional(v.string()),
    h1Count: v.optional(v.number()),
    h1Text: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    internalLinksCount: v.optional(v.number()),
    externalLinksCount: v.optional(v.number()),
    imagesCount: v.optional(v.number()),
    imagesWithoutAlt: v.optional(v.number()),
    robotsDirective: v.optional(v.string()),
    hasSchemaMarkup: v.optional(v.boolean()),
    issueCount: v.optional(v.number()),
    crawledAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_audit", ["auditId"])
    .index("by_audit_and_status", ["auditId", "crawlStatus"])
    .index("by_audit_and_url", ["auditId", "url"]),

  auditIssues: defineTable({
    auditId: v.id("audits"),
    pageId: v.optional(v.id("auditPages")),
    pageUrl: v.string(),
    issueType: v.string(),
    severity: v.string(), // critical | high | medium | low | info
    category: v.string(), // technical | content | indexation | links
    title: v.string(),
    description: v.string(),
    why: v.string(),
    recommendation: v.string(),
    developerNote: v.optional(v.string()),
    contentNote: v.optional(v.string()),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_audit", ["auditId"])
    .index("by_audit_and_severity", ["auditId", "severity"])
    .index("by_audit_and_category", ["auditId", "category"])
    .index("by_audit_and_page_url", ["auditId", "pageUrl"]),

  // ── Keywords & Rankings tables ─────────────────────────────────

  keywords: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    keyword: v.string(),
    // Location targeting (optional override from project default)
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    // Classification
    intent: v.optional(v.string()), // informational | navigational | commercial | transactional
    priority: v.optional(v.string()), // high | medium | low
    status: v.optional(v.string()), // tracking | paused | archived
    // Metadata
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    // Latest rank snapshot (denormalized for fast list queries)
    latestPosition: v.optional(v.number()),
    latestPositionDate: v.optional(v.string()),
    previousPosition: v.optional(v.number()),
    bestPosition: v.optional(v.number()),
    // Separate per-source latest positions for split-column display
    gscPosition: v.optional(v.number()),           // latest position from GSC
    gscPreviousPosition: v.optional(v.number()),   // previous GSC position (for trend arrow)
    serpPosition: v.optional(v.number()),          // latest position from Bright Data SERP
    serpPreviousPosition: v.optional(v.number()),  // previous SERP position (for trend arrow)
    // Source of this keyword
    source: v.optional(v.string()), // manual | csv | gsc
    addedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_project_and_keyword", ["projectId", "keyword"]),

  rankSnapshots: defineTable({
    keywordId: v.id("keywords"),
    projectId: v.id("projects"),
    // Date of the snapshot (YYYY-MM-DD)
    snapshotDate: v.string(),
    position: v.optional(v.number()), // null = not found in top 100
    url: v.optional(v.string()), // landing URL that ranked
    // Data source
    source: v.string(), // gsc | estimated | manual
    clicks: v.optional(v.number()),
    impressions: v.optional(v.number()),
    ctr: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_keyword", ["keywordId"])
    .index("by_keyword_and_date", ["keywordId", "snapshotDate"])
    .index("by_project_and_date", ["projectId", "snapshotDate"]),

  // ── Google Search Console tables ───────────────────────────────

  gscConnections: defineTable({
    userId: v.id("users"),
    // OAuth tokens
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.string(), // ISO 8601 UTC
    // Connected Google account info
    googleEmail: v.optional(v.string()),
    // Selected property for each project (stored as projectId → propertyUrl map)
    selectedProperties: v.optional(v.record(v.string(), v.string())),
  }).index("by_user", ["userId"]),

  gscCache: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    cacheKey: v.string(), // e.g. "queries_7d", "pages_28d"
    data: v.string(), // JSON stringified
    fetchedAt: v.string(), // ISO 8601 UTC
    ttlMinutes: v.number(),
  })
    .index("by_user_project_key", ["userId", "projectId", "cacheKey"])
    .index("by_project", ["projectId"]),

  // ── Content tools tables ────────────────────────────────────────

  contentPieces: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    title: v.string(),
    targetKeyword: v.optional(v.string()),
    secondaryKeywords: v.optional(v.array(v.string())),
    contentType: v.string(), // "blog_post" | "landing_page" | "product_page" | "meta" | "brief"
    status: v.string(), // "idea" | "brief" | "draft" | "review" | "published" | "monitor" | "refresh"
    content: v.optional(v.string()), // Markdown body
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    publishedAt: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    // AI quality check results
    qualityScore: v.optional(v.number()),
    qualityFlags: v.optional(v.array(v.string())),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_project_and_scheduled", ["projectId", "scheduledAt"]),

  // ── GA4 Analytics tables ────────────────────────────────────────

  ga4Connections: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.string(), // ISO 8601 UTC
    googleEmail: v.optional(v.string()),
    // Selected GA4 property for each project (projectId → propertyId)
    selectedProperties: v.optional(v.record(v.string(), v.string())),
  }).index("by_user", ["userId"]),

  // ── PageSpeed / Core Web Vitals cache ───────────────────────────

  pagespeedCache: defineTable({
    projectId: v.id("projects"),
    url: v.string(),
    strategy: v.string(), // "mobile" | "desktop"
    data: v.string(), // JSON stringified PSI result
    fetchedAt: v.string(), // ISO 8601 UTC
  })
    .index("by_project", ["projectId"])
    .index("by_project_url_strategy", ["projectId", "url", "strategy"]),

  // ── Schema Markup (Structured Data) table ──────────────────────

  schemaMarkups: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    name: v.string(),
    schemaType: v.string(), // "Article" | "Product" | "FAQPage" | "LocalBusiness" | etc.
    jsonld: v.string(), // JSON stringified JSON-LD
    targetUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_type", ["projectId", "schemaType"]),

  // ── Alerts table ────────────────────────────────────────────────

  alerts: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    type: v.string(), // "ranking_drop" | "traffic_drop" | "crawl_error" | "index_issue" | "custom"
    severity: v.string(), // "critical" | "high" | "medium" | "low"
    title: v.string(),
    description: v.string(),
    metric: v.optional(v.string()), // e.g. "organic_traffic", "position", "error_count"
    threshold: v.optional(v.number()), // threshold value that triggered
    currentValue: v.optional(v.number()),
    previousValue: v.optional(v.number()),
    isRead: v.boolean(),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_read", ["projectId", "isRead"])
    .index("by_project_and_type", ["projectId", "type"]),

  // ── SEO Experiments table ───────────────────────────────────────

  seoExperiments: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    title: v.string(),
    hypothesis: v.string(),
    changeDescription: v.string(),
    targetUrl: v.optional(v.string()),
    targetKeyword: v.optional(v.string()),
    status: v.string(), // "planned" | "running" | "paused" | "completed" | "abandoned"
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    baselinePosition: v.optional(v.number()),
    currentPosition: v.optional(v.number()),
    baselineClicks: v.optional(v.number()),
    currentClicks: v.optional(v.number()),
    result: v.optional(v.string()), // "positive" | "negative" | "neutral" | "inconclusive"
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"]),

  // ── SEO Change History table ────────────────────────────────────

  seoChanges: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    changeType: v.string(), // "content" | "technical" | "links" | "schema" | "meta" | "config" | "other"
    title: v.string(),
    description: v.string(),
    url: v.optional(v.string()),
    impactExpected: v.optional(v.string()), // "positive" | "negative" | "neutral"
    impactActual: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_type", ["projectId", "changeType"]),

  // ── URL Removal Requests table ──────────────────────────────────

  urlRemovalRequests: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    url: v.string(),
    reason: v.optional(v.string()), // "outdated_content" | "other_content" | "clear_cache"
    status: v.string(), // "queued" | "submitted" | "removed" | "denied"
    notes: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"]),

  // ── CMS Connections table ───────────────────────────────────────

  cmsConnections: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    platform: v.string(), // "wordpress" | "webflow" | "wix" | "hercules"
    label: v.optional(v.string()), // friendly name
    siteUrl: v.string(), // e.g. https://myblog.com for WordPress
    // WordPress: stored as app password (base64 user:apppassword)
    // Webflow / Wix: API token/key
    // Hercules: site URL + optional API token
    credentials: v.string(), // encoded credentials string
    authMethod: v.optional(v.string()), // "app_password" | "admin_login" | "webhook"
    webhookSecret: v.optional(v.string()), // random secret for webhook endpoint auth
    status: v.string(), // "active" | "error" | "disconnected"
    lastTestedAt: v.optional(v.string()),
    lastErrorMessage: v.optional(v.string()),
    webhookLastReceivedAt: v.optional(v.string()),
    webhookTotalEvents: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_platform", ["projectId", "platform"]),

  // ── Topic Map table ─────────────────────────────────────────────────────────
  // Stores saved topic clusters (pillar + cluster pages) per project.
  // Users build their topic map here; AI generates suggestions that avoid existing topics.

  topicClusters: defineTable({
    projectId: v.id("projects"),
    pillarTopic: v.string(),            // e.g. "Email Marketing"
    pillarKeyword: v.string(),          // e.g. "email marketing software"
    description: v.optional(v.string()),
    pillarPageUrl: v.optional(v.string()),  // URL of the pillar page (if exists)
    clusterPages: v.array(v.object({
      keyword: v.string(),
      intent: v.string(),               // informational | commercial | transactional | navigational
      pageUrl: v.optional(v.string()),  // URL if page exists
      status: v.string(),               // "published" | "draft" | "missing"
      notes: v.optional(v.string()),
    })),
    status: v.string(),                 // "active" | "archived"
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),
});
