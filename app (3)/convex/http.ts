import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

const http = httpRouter();

/**
 * WordPress Webhook Endpoint
 *
 * WordPress sends a POST to:
 *   https://<deployment>.convex.site/wp-webhook?projectId=<id>&secret=<secret>
 *
 * The WordPress plugin (WP Webhooks, PublishPress, or custom) should be
 * configured to POST to this URL on post save/publish/delete events.
 *
 * We verify the secret query param matches what was stored on the connection.
 * Then we record the event (updates `webhookLastReceivedAt` + `webhookTotalEvents`)
 * via an internal mutation so the connection card shows "live" status.
 *
 * The payload JSON is accepted from any standard WP webhook plugin.
 */
http.route({
  path: "/wp-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const secret = url.searchParams.get("secret");

    if (!projectId || !secret) {
      return new Response("Missing projectId or secret", { status: 400 });
    }

    // Verify the secret matches the stored connection before doing anything
    const conn = await ctx.runQuery(internal.cms.queries.getConnectionByProjectAndPlatform, {
      projectId: projectId as Id<"projects">,
      platform: "wordpress",
    });

    if (!conn) {
      return new Response("Connection not found", { status: 404 });
    }

    if (conn.webhookSecret !== secret) {
      return new Response("Invalid secret", { status: 401 });
    }

    // Parse payload — accept any shape, we just record the event type
    let eventType = "unknown";
    try {
      const body = await request.json() as Record<string, unknown>;
      // WP Webhooks plugin sends "action" or "trigger". PublishPress sends "event".
      eventType = (
        (body.action ?? body.trigger ?? body.event ?? body.hook ?? "post.updated") as string
      );
    } catch { /* malformed JSON — still record it */ }

    await ctx.runMutation(internal.cms.mutations.recordWebhookEvent, {
      projectId: projectId as Id<"projects">,
      platform: "wordpress",
      eventType,
      payload: "{}",
    });

    return new Response(JSON.stringify({ received: true, event: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Allow WordPress to preflight / verify the URL is reachable
http.route({
  path: "/wp-webhook",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(JSON.stringify({ status: "ok", service: "Maxentrix WordPress Webhook" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
