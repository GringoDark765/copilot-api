/**
 * Fetch with timeout utility
 * Wraps fetch with AbortController timeout to prevent hanging requests
 */

const DEFAULT_TIMEOUT = 30000 // 30 seconds

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch with automatic timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout (default: 30s)
 * @returns Promise<Response>
 * @throws Error if request times out
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms: ${String(url)}`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
