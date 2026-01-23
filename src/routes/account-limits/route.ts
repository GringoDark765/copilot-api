/**
 * Account Limits Route
 * Returns account usage limits and status
 */

import { Hono } from "hono"

import {
  getAccountsStatus,
  getCurrentAccount,
  getPoolConfig,
  isPoolEnabledSync,
} from "~/lib/account-pool"
import { state } from "~/lib/state"

export const accountLimitsRoute = new Hono()

interface AccountLimitInfo {
  id: string
  login: string
  active: boolean
  rateLimited: boolean
  rateLimitResetAt?: string
  requestCount: number
  errorCount: number
  lastUsed?: string
  lastError?: string
}

/**
 * GET /account-limits
 * Query params:
 * - format: "json" (default) | "table" | "simple"
 */
accountLimitsRoute.get("/", async (c) => {
  const format = c.req.query("format") ?? "json"

  if (!isPoolEnabledSync()) {
    // Single account mode
    const singleAccount: AccountLimitInfo = {
      id: state.githubUser?.login ?? "unknown",
      login: state.githubUser?.login ?? "unknown",
      active: Boolean(state.copilotToken),
      rateLimited: false,
      requestCount: 0,
      errorCount: 0,
    }

    if (format === "table") {
      return c.text(formatTable([singleAccount]))
    }

    if (format === "simple") {
      return c.text(formatSimple([singleAccount]))
    }

    return c.json({
      status: "ok",
      poolEnabled: false,
      accounts: [singleAccount],
    })
  }

  // Multi-account pool mode
  const accounts = await getAccountsStatus()
  const poolConfig = await getPoolConfig()
  const currentAccount = getCurrentAccount()

  const accountInfos: Array<AccountLimitInfo> = accounts.map((a) => ({
    id: a.id,
    login: a.login,
    active: a.active,
    rateLimited: a.rateLimited,
    rateLimitResetAt:
      a.rateLimitResetAt ?
        new Date(a.rateLimitResetAt).toISOString()
      : undefined,
    requestCount: a.requestCount,
    errorCount: a.errorCount,
    lastUsed: a.lastUsed ? new Date(a.lastUsed).toISOString() : undefined,
    lastError: a.lastError,
  }))

  if (format === "table") {
    return c.text(
      formatTable(accountInfos, poolConfig.strategy, currentAccount?.id),
    )
  }

  if (format === "simple") {
    return c.text(
      formatSimple(accountInfos, poolConfig.strategy, currentAccount?.id),
    )
  }

  return c.json({
    status: "ok",
    poolEnabled: true,
    strategy: poolConfig.strategy,
    currentAccount: currentAccount?.id,
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a) => a.active && !a.rateLimited).length,
    accounts: accountInfos,
  })
})

/**
 * Format as ASCII table
 */
function formatTable(
  accounts: Array<AccountLimitInfo>,
  strategy?: string,
  currentId?: string,
): string {
  const header = `
┌──────────────────────────────────────────────────────────────────────┐
│                       ACCOUNT LIMITS STATUS                          │
├──────────────────────────────────────────────────────────────────────┤`

  const strategyLine =
    strategy ?
      `│ Strategy: ${strategy.padEnd(10)} Current: ${(currentId ?? "N/A").padEnd(20)}            │`
    : ""

  const separator = `├────────────┬────────┬────────────┬──────────┬────────┬──────────────┤
│   Account  │ Active │ Rate Limit │ Requests │ Errors │  Last Error  │
├────────────┼────────┼────────────┼──────────┼────────┼──────────────┤`

  const rows = accounts.map((a) => {
    const indicator = currentId === a.id ? "→" : " "
    const account = (indicator + a.login).slice(0, 10).padEnd(10)
    const active = a.active ? "  ✓   " : "  ✗   "
    const rateLimited = a.rateLimited ? "    ✓     " : "    ✗     "
    const requests = String(a.requestCount).padStart(6).padEnd(8)
    const errors = String(a.errorCount).padStart(4).padEnd(6)
    const lastError = (a.lastError ?? "-").slice(0, 12).padEnd(12)
    return `│ ${account} │${active}│${rateLimited}│${requests}│${errors}│ ${lastError} │`
  })

  const footer = `└────────────┴────────┴────────────┴──────────┴────────┴──────────────┘`

  return [header, strategyLine, separator, ...rows, footer]
    .filter(Boolean)
    .join("\n")
}

/**
 * Format as simple text
 */
function formatSimple(
  accounts: Array<AccountLimitInfo>,
  strategy?: string,
  currentId?: string,
): string {
  const lines: Array<string> = []

  if (strategy) {
    lines.push(`Strategy: ${strategy}`, `Current: ${currentId ?? "N/A"}`, "")
  }

  for (const a of accounts) {
    const indicator = currentId === a.id ? "→ " : "  "
    let status: string
    if (!a.active) {
      status = "✗ Inactive"
    } else if (a.rateLimited) {
      status = "⚠️ RATE LIMITED"
    } else {
      status = "✓ Active"
    }
    lines.push(
      `${indicator}${a.login}: ${status} | Requests: ${a.requestCount} | Errors: ${a.errorCount}`,
    )
    if (a.lastError) {
      lines.push(`    Last error: ${a.lastError}`)
    }
    if (a.rateLimitResetAt) {
      lines.push(`    Reset at: ${a.rateLimitResetAt}`)
    }
  }

  return lines.join("\n")
}
