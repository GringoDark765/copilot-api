import { Hono } from "hono"

import { getConfig } from "~/lib/config"
import { state } from "~/lib/state"

export const tokenRoute = new Hono()

tokenRoute.get("/", (c) => {
  try {
    const config = getConfig()
    if (config.webuiPassword) {
      return c.json({ error: "Token endpoint disabled" }, 403)
    }
    return c.json({
      token: state.copilotToken,
    })
  } catch (error) {
    console.error("Error fetching token:", error)
    return c.json({ error: "Failed to fetch token", token: null }, 500)
  }
})
