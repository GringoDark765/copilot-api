/**
 * Notification Center Module
 * In-app notifications with SSE broadcast
 */

export const NOTIFICATION_EVENT = "notification"

export interface Notification {
  id: string
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  timestamp: number
  read: boolean
  data?: Record<string, unknown>
}

// Max notifications to keep in memory
const MAX_NOTIFICATIONS = 50

// In-memory state
const notifications: Array<Notification> = []

// Event emitter for SSE broadcasts
export const notificationEmitter = new EventTarget()

/**
 * Generate unique notification ID
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Add a notification
 */
interface AddNotificationOptions {
  type: Notification["type"]
  title: string
  message: string
  data?: Record<string, unknown>
}

export function addNotification({
  type,
  title,
  message,
  data,
}: AddNotificationOptions): Notification {
  const notification: Notification = {
    id: generateId(),
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    data,
  }

  notifications.unshift(notification)

  // Keep only recent notifications
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.splice(MAX_NOTIFICATIONS)
  }

  // Emit event for SSE subscribers
  notificationEmitter.dispatchEvent(
    new CustomEvent<Notification>(NOTIFICATION_EVENT, { detail: notification }),
  )

  return notification
}

/**
 * Get all notifications
 */
export function getNotifications(): Array<Notification> {
  return [...notifications]
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return notifications.filter((n) => !n.read).length
}

/**
 * Mark a notification as read
 */
export function markAsRead(id: string): boolean {
  const notification = notifications.find((n) => n.id === id)
  if (!notification) return false

  notification.read = true
  return true
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): number {
  let count = 0
  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true
      count++
    }
  }
  return count
}

/**
 * Delete a notification
 */
export function deleteNotification(id: string): boolean {
  const index = notifications.findIndex((n) => n.id === id)
  if (index === -1) return false

  notifications.splice(index, 1)
  return true
}

/**
 * Clear all notifications
 */
export function clearNotifications(): number {
  const count = notifications.length
  notifications.length = 0
  return count
}

// Convenience functions for different notification types

/**
 * Add info notification
 */
export function notifyInfo(
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Notification {
  return addNotification({ type: "info", title, message, data })
}

/**
 * Add warning notification
 */
export function notifyWarning(
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Notification {
  return addNotification({ type: "warning", title, message, data })
}

/**
 * Add error notification
 */
export function notifyError(
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Notification {
  return addNotification({ type: "error", title, message, data })
}

/**
 * Add success notification
 */
export function notifySuccess(
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Notification {
  return addNotification({ type: "success", title, message, data })
}

// Pre-defined notification helpers

/**
 * Notify about account rotation
 */
export function notifyAccountRotation(
  fromAccount: string,
  toAccount: string,
  reason: string,
): void {
  addNotification({
    type: "info",
    title: "Account Rotated",
    message: `Switched from ${fromAccount} to ${toAccount}. Reason: ${reason}`,
    data: { fromAccount, toAccount, reason },
  })
}

/**
 * Notify about low quota
 */
export function notifyQuotaLow(
  accountLogin: string,
  quotaPercent: number,
): void {
  addNotification({
    type: "warning",
    title: "Low Quota Warning",
    message: `Account ${accountLogin} quota is at ${quotaPercent.toFixed(1)}%`,
    data: { accountLogin, quotaPercent },
  })
}

/**
 * Notify about rate limit
 */
export function notifyRateLimit(accountLogin: string, resetAt?: number): void {
  const resetTime = resetAt ? new Date(resetAt).toLocaleTimeString() : "unknown"
  addNotification({
    type: "warning",
    title: "Rate Limit Hit",
    message: `Account ${accountLogin} hit rate limit. Resets at ${resetTime}`,
    data: { accountLogin, resetAt },
  })
}

/**
 * Notify about queue full
 */
export function notifyQueueFull(queueSize: number): void {
  addNotification({
    type: "error",
    title: "Queue Full",
    message: `Request queue is full (${queueSize} pending). New requests will be rejected.`,
    data: { queueSize },
  })
}

/**
 * Notify about webhook failure
 */
export function notifyWebhookFailed(error: string): void {
  addNotification({
    type: "error",
    title: "Webhook Failed",
    message: `Failed to deliver webhook notification: ${error}`,
    data: { error },
  })
}

/**
 * Notify about account error
 */
export function notifyAccountError(accountLogin: string, error: string): void {
  addNotification({
    type: "error",
    title: "Account Error",
    message: `Account ${accountLogin} error: ${error}`,
    data: { accountLogin, error },
  })
}

/**
 * Notify about cache cleared
 */
export function notifyCacheCleared(entriesCleared: number): void {
  addNotification({
    type: "success",
    title: "Cache Cleared",
    message: `Successfully cleared ${entriesCleared} cached entries.`,
    data: { entriesCleared },
  })
}

export const notificationCenter = {
  add: addNotification,
  getAll: getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  delete: deleteNotification,
  clear: clearNotifications,
  info: notifyInfo,
  warning: notifyWarning,
  error: notifyError,
  success: notifySuccess,
  // Pre-defined notifications
  accountRotation: notifyAccountRotation,
  quotaLow: notifyQuotaLow,
  rateLimit: notifyRateLimit,
  queueFull: notifyQueueFull,
  webhookFailed: notifyWebhookFailed,
  accountError: notifyAccountError,
  cacheCleared: notifyCacheCleared,
}
