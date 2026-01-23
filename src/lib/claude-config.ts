/**
 * Claude CLI Configuration Manager
 * Reads and writes Claude Code CLI settings.json
 */

import consola from "consola"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

// Claude CLI config path
const CLAUDE_CONFIG_DIR = path.join(os.homedir(), ".claude")
const CLAUDE_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR, "settings.json")

export interface ClaudeConfig {
  env?: Record<string, string>
  permissions?: {
    allow?: Array<string>
    deny?: Array<string>
  }
  [key: string]: unknown
}

/**
 * Get Claude config path
 */
export function getClaudeConfigPath(): string {
  return CLAUDE_CONFIG_FILE
}

/**
 * Ensure Claude config directory exists
 */
async function ensureClaudeDir(): Promise<void> {
  try {
    await fs.mkdir(CLAUDE_CONFIG_DIR, { recursive: true })
  } catch {
    // Directory already exists
  }
}

/**
 * Read Claude CLI configuration
 */
export async function readClaudeConfig(): Promise<ClaudeConfig> {
  try {
    const content = await fs.readFile(CLAUDE_CONFIG_FILE)
    return JSON.parse(content.toString()) as ClaudeConfig
  } catch {
    // Return empty config if file doesn't exist
    return {}
  }
}

/**
 * Update Claude CLI configuration (merge with existing)
 */
export async function updateClaudeConfig(
  updates: Partial<ClaudeConfig>,
): Promise<void> {
  await ensureClaudeDir()

  const current = await readClaudeConfig()

  // Deep merge env if both exist
  if (updates.env && current.env) {
    updates.env = { ...current.env, ...updates.env }
  }

  // Deep merge permissions if both exist
  if (updates.permissions && current.permissions) {
    updates.permissions = {
      allow: [
        ...(current.permissions.allow || []),
        ...(updates.permissions.allow || []),
      ],
      deny: [
        ...(current.permissions.deny || []),
        ...(updates.permissions.deny || []),
      ],
    }
    // Remove duplicates
    updates.permissions.allow = [...new Set(updates.permissions.allow)]
    updates.permissions.deny = [...new Set(updates.permissions.deny)]
  }

  const newConfig = { ...current, ...updates }

  await fs.writeFile(CLAUDE_CONFIG_FILE, JSON.stringify(newConfig, null, 2))
  consola.debug("Claude CLI config updated at", CLAUDE_CONFIG_FILE)
}

/**
 * Replace entire Claude CLI configuration
 */
export async function replaceClaudeConfig(config: ClaudeConfig): Promise<void> {
  await ensureClaudeDir()
  await fs.writeFile(CLAUDE_CONFIG_FILE, JSON.stringify(config, null, 2))
  consola.debug("Claude CLI config replaced at", CLAUDE_CONFIG_FILE)
}

/**
 * Generate Claude CLI config for Copilot API
 */
export function generateCopilotConfig(
  serverUrl: string,
  model: string,
  smallModel: string,
): ClaudeConfig {
  return {
    env: {
      ANTHROPIC_BASE_URL: serverUrl,
      ANTHROPIC_AUTH_TOKEN: "dummy",
      ANTHROPIC_MODEL: model,
      ANTHROPIC_DEFAULT_SONNET_MODEL: model,
      ANTHROPIC_SMALL_FAST_MODEL: smallModel,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: smallModel,
      DISABLE_NON_ESSENTIAL_MODEL_CALLS: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    },
    permissions: {
      deny: ["WebSearch"],
    },
  }
}
