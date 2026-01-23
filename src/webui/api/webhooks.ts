import { Hono } from "hono"

import type { WebhookConfig } from "~/lib/webhook"

import { saveConfig } from "~/lib/config"

export const webhookRoutes = new Hono()

/**
 * POST /api/webhooks/test - Test webhook configuration
 */
webhookRoutes.post("/test", async (c) => {
  try {
    const { webhook } = await import("~/lib/webhook")
    const result = await webhook.test()
    if (result.success) {
      return c.json({ status: "ok", message: "Test webhook sent successfully" })
    }
    return c.json(
      { status: "error", error: result.error || "Unknown error" },
      400,
    )
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/webhooks/history - Get webhook history
 */
webhookRoutes.get("/history", async (c) => {
  try {
    const { webhook } = await import("~/lib/webhook")
    const history = webhook.getHistory()
    return c.json({ status: "ok", history })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/webhooks/config - Get webhook configuration
 */
webhookRoutes.get("/config", async (c) => {
  try {
    const { webhook } = await import("~/lib/webhook")
    const config = webhook.getConfig()
    // Hide the actual webhook URL for security
    return c.json({
      status: "ok",
      config: {
        ...config,
        webhookUrl: config.webhookUrl ? "***configured***" : "",
      },
    })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * POST /api/webhooks/config - Update webhook configuration
 */
webhookRoutes.post("/config", async (c) => {
  try {
    const { webhook } = await import("~/lib/webhook")
    const body = await c.req.json<Partial<WebhookConfig>>()
    webhook.updateConfig(body)

    // Also save to config file
    await saveConfig({
      webhookEnabled: body.enabled,
      webhookProvider: body.provider,
      webhookUrl: body.webhookUrl,
      webhookEvents: body.events,
    })

    return c.json({ status: "ok", message: "Webhook configuration updated" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})
