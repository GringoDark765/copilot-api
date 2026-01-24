export async function notifyRateLimit(
  accountLogin: string,
  resetAt: number,
): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendRateLimit(accountLogin, resetAt)
  } catch {
    // Webhook not initialized
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.rateLimit(accountLogin, resetAt)
  } catch {
    // Notification center not initialized
  }
}

export async function notifyAuthError(accountLogin: string): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendAccountError(accountLogin, "Authentication failed")
  } catch {
    // Webhook not initialized
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.accountError(accountLogin, "Authentication failed")
  } catch {
    // Notification center not initialized
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
  } catch {
    // Webhook not initialized
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.accountRotation(fromAccount, toAccount, reason)
  } catch {
    // Notification center not initialized
  }
}

export async function notifyQuotaLow(
  accountLogin: string,
  quotaPercent: number,
): Promise<void> {
  try {
    const { webhook } = await import("./webhook")
    await webhook.sendQuotaLow(accountLogin, quotaPercent)
  } catch {
    // Webhook not initialized
  }

  try {
    const { notificationCenter } = await import("./notification-center")
    notificationCenter.quotaLow(accountLogin, quotaPercent)
  } catch {
    // Notification center not initialized
  }
}
