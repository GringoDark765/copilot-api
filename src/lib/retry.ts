/**
 * Retry Utility
 * Provides exponential backoff retry logic for API calls
 */

import consola from "consola"

interface DelayOptions {
  attempt: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export interface RetryOptions {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableStatuses: Array<number>
  onRetry?: (attempt: number, error: unknown) => void
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if an error is retryable based on HTTP status
 */
function isRetryableStatus(
  error: unknown,
  retryableStatuses: Array<number>,
): boolean {
  if (error && typeof error === "object") {
    // Check for status property
    const status = (error as { status?: number }).status
    if (status && retryableStatuses.includes(status)) {
      return true
    }

    // Check for response.status
    const response = (error as { response?: { status?: number } }).response
    if (response?.status && retryableStatuses.includes(response.status)) {
      return true
    }
  }
  return false
}

/**
 * Check if an error is a network error (should retry)
 */
function isNetworkError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code = (error as { code?: string }).code
    const name = (error as { name?: string }).name

    // Network-related error codes
    const isNetworkCode =
      code === "ECONNRESET"
      || code === "ECONNREFUSED"
      || code === "ETIMEDOUT"
      || code === "ENOTFOUND"
      || code === "EAI_AGAIN"

    if (isNetworkCode) {
      return true
    }

    // Fetch abort/timeout
    if (name === "AbortError" || name === "TimeoutError") {
      return true
    }
  }
  return false
}

/**
 * Calculate delay for current attempt with jitter
 */
function calculateDelay(options: DelayOptions): number {
  const { attempt, initialDelayMs, maxDelayMs, backoffMultiplier } = options
  // Exponential backoff
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5)
  return Math.min(delay + jitter, maxDelayMs)
}

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const canRetry = attempt < opts.maxAttempts
      const isRetryable =
        isRetryableStatus(error, opts.retryableStatuses)
        || isNetworkError(error)
      const shouldRetry = canRetry && isRetryable

      if (!shouldRetry) {
        throw error
      }

      const delay = calculateDelay({
        attempt,
        initialDelayMs: opts.initialDelayMs,
        maxDelayMs: opts.maxDelayMs,
        backoffMultiplier: opts.backoffMultiplier,
      })

      consola.debug(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${Math.round(delay)}ms`,
        error,
      )

      opts.onRetry?.(attempt, error)
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Create a retry wrapper with pre-configured options
 */
export function createRetry(
  defaultOptions: Partial<RetryOptions>,
): <T>(fn: () => Promise<T>, options?: Partial<RetryOptions>) => Promise<T> {
  return <T>(fn: () => Promise<T>, options?: Partial<RetryOptions>) =>
    withRetry(fn, { ...defaultOptions, ...options })
}
