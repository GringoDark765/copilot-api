/**
 * Graceful Shutdown Manager
 * Centralized handler for process termination signals
 */

import consola from "consola"

interface ShutdownHandler {
  name: string
  handler: () => Promise<void> | void
  priority: number // Lower = runs first
}

const handlers: Array<ShutdownHandler> = []
let isShuttingDown = false

// Timeout for forced shutdown (10 seconds)
const SHUTDOWN_TIMEOUT_MS = 10000

/**
 * Register a handler to be called during graceful shutdown
 * @param name - Handler name for logging
 * @param handler - Cleanup function to run
 * @param priority - Lower priority runs first (default: 50)
 */
export function registerShutdownHandler(
  name: string,
  handler: () => Promise<void> | void,
  priority: number = 50,
): void {
  handlers.push({ name, handler, priority })
  // Sort by priority (ascending)
  handlers.sort((a, b) => a.priority - b.priority)
  consola.debug(`Shutdown handler registered: ${name} (priority: ${priority})`)
}

/**
 * Check if shutdown is in progress
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown
}

/**
 * Execute graceful shutdown
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    consola.warn("Shutdown already in progress, ignoring duplicate signal")
    return
  }

  isShuttingDown = true
  consola.info(`Received ${signal}, starting graceful shutdown...`)

  // Set a timeout for forced exit
  const forceExitTimer = setTimeout(() => {
    consola.error("Shutdown timeout exceeded, forcing exit")
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  try {
    // Run all handlers in priority order
    for (const { name, handler } of handlers) {
      try {
        consola.debug(`Running shutdown handler: ${name}`)
        await handler()
        consola.debug(`Shutdown handler completed: ${name}`)
      } catch (error) {
        consola.error(`Shutdown handler failed: ${name}`, error)
        // Continue with other handlers
      }
    }

    consola.success("Graceful shutdown completed")
  } finally {
    clearTimeout(forceExitTimer)
    process.exit(0)
  }
}

/**
 * Initialize shutdown signal handlers
 * Call this once during server startup
 */
export function initShutdownHandlers(): void {
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"))
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"))
  process.on("SIGHUP", () => void gracefulShutdown("SIGHUP"))

  consola.debug("Shutdown signal handlers initialized")
}
