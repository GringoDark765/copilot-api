/**
 * Interval Registry
 * Tracks all setInterval calls for cleanup during shutdown
 */

import consola from "consola"

const intervals: Map<string, ReturnType<typeof setInterval>> = new Map()

/**
 * Register an interval for tracking
 * @param name - Unique name for the interval
 * @param interval - The interval ID from setInterval
 */
export function registerInterval(
  name: string,
  interval: ReturnType<typeof setInterval>,
): void {
  // Clear existing interval with same name if exists
  const existing = intervals.get(name)
  if (existing) {
    clearInterval(existing)
    consola.debug(`Replaced existing interval: ${name}`)
  }

  intervals.set(name, interval)
  consola.debug(`Interval registered: ${name}`)
}

/**
 * Clear a specific interval by name
 * @param name - Name of the interval to clear
 * @returns true if interval was found and cleared
 */
export function clearRegisteredInterval(name: string): boolean {
  const interval = intervals.get(name)
  if (interval) {
    clearInterval(interval)
    intervals.delete(name)
    consola.debug(`Interval cleared: ${name}`)
    return true
  }
  return false
}

/**
 * Clear all registered intervals
 * Call this during graceful shutdown
 */
export function clearAllIntervals(): void {
  const count = intervals.size
  for (const [name, interval] of intervals) {
    clearInterval(interval)
    consola.debug(`Interval cleared: ${name}`)
  }
  intervals.clear()
  consola.debug(`Cleared ${count} intervals`)
}

/**
 * Get the number of registered intervals
 */
export function getIntervalCount(): number {
  return intervals.size
}
