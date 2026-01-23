import { Hono } from "hono"

export const costRoutes = new Hono()

/**
 * GET /api/cost/estimate - Estimate cost for tokens
 */
costRoutes.get("/estimate", async (c) => {
  try {
    const { costCalculator } = await import("~/lib/cost-calculator")
    const model = c.req.query("model") || "gpt-4.1"
    const inputTokens = Number.parseInt(c.req.query("inputTokens") || "0", 10)
    const outputTokens = Number.parseInt(c.req.query("outputTokens") || "0", 10)

    const estimate = costCalculator.calculate(model, inputTokens, outputTokens)
    return c.json({ status: "ok", estimate })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/cost/history - Get cost history
 */
costRoutes.get("/history", async (c) => {
  try {
    const { costCalculator } = await import("~/lib/cost-calculator")
    const days = Number.parseInt(c.req.query("days") || "7", 10)
    const history = costCalculator.getHistory(days)
    return c.json({ status: "ok", ...history })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/cost/pricing - Get all pricing
 */
costRoutes.get("/pricing", async (c) => {
  try {
    const { costCalculator } = await import("~/lib/cost-calculator")
    const pricing = costCalculator.getAllPricing()
    return c.json({ status: "ok", pricing })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})
