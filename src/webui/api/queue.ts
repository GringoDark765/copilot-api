import { Hono } from "hono"

export const queueRoutes = new Hono()

/**
 * GET /api/queue/status - Get queue status
 */
queueRoutes.get("/status", async (c) => {
  try {
    const { getQueueStatus } = await import("~/lib/request-queue")
    const status = getQueueStatus()
    return c.json({ status: "ok", queue: status })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * GET /api/queue/metrics - Get queue metrics
 */
queueRoutes.get("/metrics", async (c) => {
  try {
    const { getQueueMetrics } = await import("~/lib/request-queue")
    const metrics = getQueueMetrics()
    return c.json({ status: "ok", metrics })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * POST /api/queue/pause - Pause the queue
 */
queueRoutes.post("/pause", async (c) => {
  try {
    const { pauseQueue } = await import("~/lib/request-queue")
    pauseQueue()
    return c.json({ status: "ok", message: "Queue paused" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * POST /api/queue/resume - Resume the queue
 */
queueRoutes.post("/resume", async (c) => {
  try {
    const { resumeQueue } = await import("~/lib/request-queue")
    resumeQueue()
    return c.json({ status: "ok", message: "Queue resumed" })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})

/**
 * POST /api/queue/clear - Clear the queue
 */
queueRoutes.post("/clear", async (c) => {
  try {
    const { clearQueue } = await import("~/lib/request-queue")
    const count = clearQueue()
    return c.json({ status: "ok", message: `Cleared ${count} requests` })
  } catch (error) {
    return c.json({ status: "error", error: (error as Error).message }, 400)
  }
})
