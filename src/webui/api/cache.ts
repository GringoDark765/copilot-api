import { Hono } from "hono"

export const cacheRoutes = new Hono()

/**
 * GET /api/cache/stats - Get cache statistics
 */
cacheRoutes.get("/stats", async (c) => {
  try {
    const { requestCache } = await import("~/lib/request-cache")
    const stats = requestCache.getStats()
    return c.json({ status: "ok", stats })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * POST /api/cache/clear - Clear the cache
 */
cacheRoutes.post("/clear", async (c) => {
  try {
    const { requestCache } = await import("~/lib/request-cache")
    requestCache.clear()
    return c.json({ status: "ok", message: "Cache cleared" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * DELETE /api/cache/:key - Delete a specific cache entry
 */
cacheRoutes.delete("/:key", async (c) => {
  try {
    const { requestCache } = await import("~/lib/request-cache")
    const key = c.req.param("key")
    const deleted = requestCache.delete(key)
    if (!deleted) {
      return c.json({ status: "error", error: "Cache entry not found" }, 404)
    }
    return c.json({ status: "ok", message: "Cache entry deleted" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})
