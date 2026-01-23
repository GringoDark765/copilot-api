import { Hono } from "hono"

export const historyRoutes = new Hono()

/**
 * GET /api/history - Get request history
 */
historyRoutes.get("/", async (c) => {
  try {
    const { requestHistory } = await import("~/lib/request-history")
    const limit = Number.parseInt(c.req.query("limit") || "50", 10)
    const offset = Number.parseInt(c.req.query("offset") || "0", 10)
    const model = c.req.query("model")
    const status = c.req.query("status") as
      | "success"
      | "error"
      | "cached"
      | undefined
    const accountId = c.req.query("account")

    const result = requestHistory.getHistory({
      limit,
      offset,
      model,
      status,
      accountId,
    })

    return c.json({ status: "ok", ...result })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/history/stats - Get request history statistics
 */
historyRoutes.get("/stats", async (c) => {
  try {
    const { requestHistory } = await import("~/lib/request-history")
    const stats = requestHistory.getStats()
    return c.json({ status: "ok", stats })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * DELETE /api/history - Clear request history
 */
historyRoutes.delete("/", async (c) => {
  try {
    const { requestHistory } = await import("~/lib/request-history")
    requestHistory.clear()
    return c.json({ status: "ok", message: "History cleared" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})
