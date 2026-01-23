import { Hono } from "hono"

import { getCurrentAccount, isPoolEnabledSync } from "~/lib/account-pool"
import { forwardError } from "~/lib/error"
import { logEmitter } from "~/lib/logger"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "~/services/copilot/create-embeddings"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  try {
    const payload = await c.req.json<EmbeddingRequest>()

    // Log the request with account info if pool is enabled
    const accountInfo = isPoolEnabledSync() ? getCurrentAccount()?.login : null
    logEmitter.log(
      "info",
      `Embedding request: model=${payload.model}${accountInfo ? `, account=${accountInfo}` : ""}`,
    )

    const response = await createEmbeddings(payload)

    logEmitter.log(
      "success",
      `Embedding done: model=${payload.model}${accountInfo ? `, account=${accountInfo}` : ""}`,
    )

    return c.json(response)
  } catch (error) {
    return await forwardError(c, error)
  }
})
