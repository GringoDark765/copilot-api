import consola from "consola"

export async function notifyRateLimit(
  accountLogin: string,
  resetAt: number,
): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendRateLimit(accountLogin, resetAt)
  } catch (error) {
    consola.debug("Failed to send rate limit webhook:", error)
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.rateLimit(accountLogin, resetAt)
  } catch (error) {
    consola.debug("Failed to send rate limit notification:", error)
  }
}

export async function notifyAuthError(accountLogin: string): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendAccountError(accountLogin, "Authentication failed")
  } catch (error) {
    consola.debug("Failed to send auth error webhook:", error)
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.accountError(accountLogin, "Authentication failed")
  } catch (error) {
    consola.debug("Failed to send auth error notification:", error)
  }
}

export async function notifyAccountRotation(
  fromAccount: string,
  toAccount: string,
  reason: string,
): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendAccountRotation(fromAccount, toAccount, reason)
  } catch (error) {
    consola.debug("Failed to send account rotation webhook:", error)
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.accountRotation(fromAccount, toAccount, reason)
  } catch (error) {
    consola.debug("Failed to send account rotation notification:", error)
  }
}

export async function notifyQuotaLow(
  accountLogin: string,
  quotaPercent: number,
): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendQuotaLow(accountLogin, quotaPercent)
  } catch (error) {
    consola.debug("Failed to send quota low webhook:", error)
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.quotaLow(accountLogin, quotaPercent)
  } catch (error) {
    consola.debug("Failed to send quota low notification:", error)
  }
}
