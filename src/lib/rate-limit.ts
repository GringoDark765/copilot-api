import consola from "consola"

import type { State } from "./state"

import { HTTPError } from "./error"
import { sleep } from "./utils"

function updateTimestamp(state: State): void {
  state.lastRequestTimestamp = Date.now()
}

export async function checkRateLimit(state: State) {
  if (state.rateLimitSeconds === undefined) return

  const now = Date.now()
  const lastTimestamp = state.lastRequestTimestamp

  if (!lastTimestamp) {
    updateTimestamp(state)
    return
  }

  const elapsedSeconds = (now - lastTimestamp) / 1000

  if (elapsedSeconds > state.rateLimitSeconds) {
    updateTimestamp(state)
    return
  }

  const waitTimeSeconds = Math.ceil(state.rateLimitSeconds - elapsedSeconds)

  if (!state.rateLimitWait) {
    consola.warn(
      `Rate limit exceeded. Need to wait ${waitTimeSeconds} more seconds.`,
    )
    throw new HTTPError(
      "Rate limit exceeded",
      Response.json({ message: "Rate limit exceeded" }, { status: 429 }),
    )
  }

  const waitTimeMs = waitTimeSeconds * 1000
  consola.warn(
    `Rate limit reached. Waiting ${waitTimeSeconds} seconds before proceeding...`,
  )
  await sleep(waitTimeMs)
  // Update timestamp after await with fresh time
  updateTimestamp(state)
  consola.info("Rate limit wait completed, proceeding with request")
  return
}
