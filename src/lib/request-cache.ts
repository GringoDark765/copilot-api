/**
 * Request Caching Module
 * Caches identical requests to save quota
 * Uses proper LRU with O(1) eviction via doubly linked list
 */

import consola from "consola"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { getConfig } from "./config"

export interface CacheEntry {
  key: string
  response: unknown
  model: string
  inputTokens: number
  outputTokens: number
  createdAt: number
  lastAccessed: number
  hits: number
}

// Internal node for doubly linked list (LRU tracking)
interface LRUNode {
  key: string
  prev: LRUNode | null
  next: LRUNode | null
}

export interface CacheConfig {
  enabled: boolean
  maxSize: number
  ttlSeconds: number
}

export interface CacheStats {
  enabled: boolean
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number
  savedTokens: number
}

// File path for cache
const CONFIG_DIR = path.join(os.homedir(), ".config", "copilot-api")
const CACHE_FILE = path.join(CONFIG_DIR, "request-cache.json")

// In-memory cache using Map for O(1) lookup
let cache: Map<string, CacheEntry> = new Map()

// LRU tracking with doubly linked list for O(1) eviction
let lruNodes: Map<string, LRUNode> = new Map()
let lruHead: LRUNode | null = null // Most recently used
let lruTail: LRUNode | null = null // Least recently used

let cacheConfig: CacheConfig = {
  enabled: false,
  maxSize: 1000,
  ttlSeconds: 3600,
}

// Stats
let hits = 0
let misses = 0
let savedTokens = 0
let isDirty = false

/**
 * Move a node to the front (most recently used)
 */
function moveToFront(node: LRUNode): void {
  if (node === lruHead) return // Already at front

  // Remove from current position
  if (node.prev) node.prev.next = node.next
  if (node.next) node.next.prev = node.prev
  if (node === lruTail) lruTail = node.prev

  // Move to front
  node.prev = null
  node.next = lruHead
  if (lruHead) lruHead.prev = node
  lruHead = node
  if (!lruTail) lruTail = node
}

/**
 * Add a new node to the front
 */
function addToFront(key: string): LRUNode {
  const node: LRUNode = { key, prev: null, next: lruHead }
  if (lruHead) lruHead.prev = node
  lruHead = node
  if (!lruTail) lruTail = node
  lruNodes.set(key, node)
  return node
}

/**
 * Remove tail node (least recently used)
 */
function removeTail(): string | null {
  if (!lruTail) return null

  const key = lruTail.key
  lruNodes.delete(key)

  if (lruTail.prev) {
    lruTail.prev.next = null
    lruTail = lruTail.prev
  } else {
    // List is now empty
    lruHead = null
    lruTail = null
  }

  return key
}

/**
 * Remove a specific node
 */
function removeNode(key: string): void {
  const node = lruNodes.get(key)
  if (!node) return

  if (node.prev) node.prev.next = node.next
  if (node.next) node.next.prev = node.prev
  if (node === lruHead) lruHead = node.next
  if (node === lruTail) lruTail = node.prev

  lruNodes.delete(key)
}

/**
 * Reset LRU state
 */
function resetLRU(): void {
  lruNodes = new Map()
  lruHead = null
  lruTail = null
}

/**
 * Ensure config directory exists
 */
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
  } catch {
    // Directory exists
  }
}

/**
 * Generate cache key from request
 */
type CacheKeyOptions = {
  temperature?: number
  max_tokens?: number
  tools?: Array<unknown>
  accountId?: string
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
  stop?: string | Array<string> | null
  response_format?: { type: "json_object" } | null
  tool_choice?:
    | "none"
    | "auto"
    | "required"
    | { type: "function"; function: { name: string } }
    | null
  user?: string | null
  logit_bias?: Record<string, number> | null
  logprobs?: boolean | null
  n?: number | null
  stream?: boolean | null
}

function normalizeMessages(
  messages: Array<{ role: string; content: unknown }>,
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string" ?
        msg.content
      : JSON.stringify(msg.content),
  }))
}

function getToolsHash(tools?: Array<unknown>): string | undefined {
  return tools ? JSON.stringify(tools) : undefined
}

function buildOptionsPayload(options?: CacheKeyOptions) {
  if (!options) return { tools: undefined }
  return {
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    accountId: options.accountId,
    top_p: options.top_p,
    frequency_penalty: options.frequency_penalty,
    presence_penalty: options.presence_penalty,
    seed: options.seed,
    stop: options.stop,
    response_format: options.response_format,
    tool_choice: options.tool_choice,
    user: options.user,
    logit_bias: options.logit_bias,
    logprobs: options.logprobs,
    n: options.n,
    stream: options.stream,
    tools: getToolsHash(options.tools),
  }
}

function buildCacheKeyPayload(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  options?: CacheKeyOptions,
) {
  return {
    model,
    messages: normalizeMessages(messages),
    ...buildOptionsPayload(options),
  }
}

export function generateCacheKey(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  options?: CacheKeyOptions,
): string {
  const payload = buildCacheKeyPayload(model, messages, options)

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16)

  return `${model}_${hash}`
}

/**
 * Load cache from disk
 */
async function loadCache(): Promise<void> {
  try {
    await ensureDir()
    const data = await fs.readFile(CACHE_FILE)
    const parsed = JSON.parse(data.toString()) as {
      entries?: Array<CacheEntry>
      stats?: { hits: number; misses: number; savedTokens: number }
    }

    cache = new Map()
    resetLRU()
    const now = Date.now()
    const ttlMs = cacheConfig.ttlSeconds * 1000

    // Load entries sorted by lastAccessed (oldest first for proper LRU order)
    const validEntries = (parsed.entries ?? [])
      .filter((entry) => now - entry.createdAt < ttlMs)
      .sort((a, b) => a.lastAccessed - b.lastAccessed)

    for (const entry of validEntries) {
      cache.set(entry.key, entry)
      addToFront(entry.key)
    }

    // Restore stats
    if (parsed.stats) {
      hits = parsed.stats.hits || 0
      misses = parsed.stats.misses || 0
      savedTokens = parsed.stats.savedTokens || 0
    }

    consola.debug(`Cache loaded: ${cache.size} entries`)
  } catch {
    cache = new Map()
    resetLRU()
    consola.debug("Starting fresh cache")
  }
}

/**
 * Save cache to disk
 */
function saveCache(): void {
  if (!isDirty) return

  const entries = Array.from(cache.values())
  const data = {
    entries,
    stats: { hits, misses, savedTokens },
  }

  isDirty = false
  void ensureDir()
    .then(() => fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2)))
    .then(() => {
      consola.debug("Cache saved")
    })
    .catch((error: unknown) => {
      isDirty = true
      consola.error("Failed to save cache:", error)
    })
}

/**
 * Evict least recently used entries - O(1) per eviction
 */
function evictLRU(): void {
  while (cache.size > cacheConfig.maxSize) {
    const key = removeTail()
    if (key) {
      cache.delete(key)
      isDirty = true
    } else {
      break
    }
  }
}

/**
 * Get a cached response
 */
export function getCachedResponse(key: string): CacheEntry | null {
  if (!cacheConfig.enabled) {
    return null
  }

  const entry = cache.get(key)
  if (!entry) {
    misses++
    return null
  }

  // Check if expired
  const now = Date.now()
  const ttlMs = cacheConfig.ttlSeconds * 1000
  if (now - entry.createdAt > ttlMs) {
    cache.delete(key)
    removeNode(key)
    misses++
    isDirty = true
    return null
  }

  // Update stats and move to front of LRU
  entry.lastAccessed = now
  entry.hits++
  hits++
  savedTokens += entry.inputTokens + entry.outputTokens
  isDirty = true

  // Move to front of LRU (most recently used)
  const node = lruNodes.get(key)
  if (node) moveToFront(node)

  return entry
}

/**
 * Set a cached response
 */
interface SetCachedResponseOptions {
  key: string
  response: unknown
  model: string
  inputTokens: number
  outputTokens: number
}

export function setCachedResponse({
  key,
  response,
  model,
  inputTokens,
  outputTokens,
}: SetCachedResponseOptions): void {
  if (!cacheConfig.enabled) return

  const now = Date.now()

  const entry: CacheEntry = {
    key,
    response,
    model,
    inputTokens,
    outputTokens,
    createdAt: now,
    lastAccessed: now,
    hits: 0,
  }

  // If key already exists, update LRU position
  if (cache.has(key)) {
    const node = lruNodes.get(key)
    if (node) moveToFront(node)
  } else {
    addToFront(key)
  }

  cache.set(key, entry)
  isDirty = true

  // Evict if needed
  evictLRU()
}

/**
 * Delete a specific cache entry
 */
export function deleteCacheEntry(key: string): boolean {
  const deleted = cache.delete(key)
  if (deleted) {
    removeNode(key)
    isDirty = true
  }
  return deleted
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache = new Map()
  resetLRU()
  isDirty = true
  consola.info("Cache cleared")
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = hits + misses
  return {
    enabled: cacheConfig.enabled,
    size: cache.size,
    maxSize: cacheConfig.maxSize,
    hits,
    misses,
    hitRate: total > 0 ? Math.round((hits / total) * 100) / 100 : 0,
    savedTokens,
  }
}

/**
 * Get all cache entries (for debugging/admin)
 */
export function getCacheEntries(): Array<CacheEntry> {
  return Array.from(cache.values()).sort(
    (a, b) => b.lastAccessed - a.lastAccessed,
  )
}

/**
 * Update cache configuration
 */
export function updateCacheConfig(config: Partial<CacheConfig>): void {
  cacheConfig = { ...cacheConfig, ...config }

  // If disabled, clear the cache
  if (!cacheConfig.enabled) {
    cache = new Map()
    resetLRU()
  }

  // Evict if max size reduced
  evictLRU()

  consola.debug("Cache config updated:", cacheConfig)
}

/**
 * Initialize cache module
 */
export async function initCache(): Promise<void> {
  // Load config
  const config = getConfig()
  cacheConfig = {
    enabled: config.cacheEnabled,
    maxSize: config.cacheMaxSize,
    ttlSeconds: config.cacheTtlSeconds,
  }

  if (cacheConfig.enabled) {
    await loadCache()
  }

  // Auto-save every 5 minutes
  setInterval(
    () => {
      saveCache()
    },
    5 * 60 * 1000,
  )

  // Save on process exit
  process.on("beforeExit", () => {
    saveCache()
  })

  consola.debug(
    `Request cache initialized: enabled=${cacheConfig.enabled}, maxSize=${cacheConfig.maxSize}`,
  )
}

/**
 * Reset cache stats
 */
export function resetCacheStats(): void {
  hits = 0
  misses = 0
  savedTokens = 0
  isDirty = true
}

export const requestCache = {
  init: initCache,
  generateKey: generateCacheKey,
  get: getCachedResponse,
  set: setCachedResponse,
  delete: deleteCacheEntry,
  clear: clearCache,
  getStats: getCacheStats,
  getEntries: getCacheEntries,
  updateConfig: updateCacheConfig,
  resetStats: resetCacheStats,
  save: saveCache,
}
