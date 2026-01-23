/**
 * Logger Module with Event Emitter
 * Extends consola with log streaming capability
 */

import consola from "consola"

interface LogEntry {
  level: string
  message: string
  timestamp: string
}

type LogListener = (entry: LogEntry) => void

class LogEmitter {
  private recentLogs: Array<LogEntry> = []
  private maxLogs = 1000
  private listeners: Set<LogListener> = new Set()

  /**
   * Add a log entry and emit event
   */
  log(level: string, message: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    // Add to recent logs (circular buffer)
    this.recentLogs.push(entry)
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs.shift()
    }

    // Emit to listeners
    for (const listener of this.listeners) {
      try {
        listener(entry)
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Subscribe to log events
   */
  on(_event: "log", listener: LogListener): void {
    this.listeners.add(listener)
  }

  /**
   * Unsubscribe from log events
   */
  off(_event: "log", listener: LogListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): Array<LogEntry> {
    return this.recentLogs.slice(-limit)
  }

  /**
   * Create a wrapped logger that also emits events
   */
  createLogger() {
    return {
      info: (...args: Array<unknown>) => {
        const message = args.map(String).join(" ")
        consola.info(message)
        this.log("info", message)
      },
      warn: (...args: Array<unknown>) => {
        const message = args.map(String).join(" ")
        consola.warn(message)
        this.log("warn", message)
      },
      error: (...args: Array<unknown>) => {
        const message = args.map(String).join(" ")
        consola.error(message)
        this.log("error", message)
      },
      debug: (...args: Array<unknown>) => {
        const message = args.map(String).join(" ")
        consola.debug(message)
        this.log("debug", message)
      },
      success: (...args: Array<unknown>) => {
        const message = args.map(String).join(" ")
        consola.success(message)
        this.log("success", message)
      },
      box: (message: string) => {
        consola.box(message)
      },
      // Expose raw consola for direct access
      raw: consola,
    }
  }
}

export const logEmitter = new LogEmitter()
export const logger = logEmitter.createLogger()
