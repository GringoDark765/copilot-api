import { GITHUB_API_BASE_URL, githubHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/error"
import { fetchWithTimeout } from "~/lib/fetch-with-timeout"
import { state } from "~/lib/state"

// Timeout for token requests (10 seconds - should be fast)
const TOKEN_REQUEST_TIMEOUT = 10000

export const getCopilotToken = async (token?: string) => {
  const authToken = token ?? state.githubToken
  const response = await fetchWithTimeout(
    `${GITHUB_API_BASE_URL}/copilot_internal/v2/token`,
    {
      headers: githubHeaders({ ...state, githubToken: authToken }),
      timeout: TOKEN_REQUEST_TIMEOUT,
    },
  )

  if (!response.ok) throw new HTTPError("Failed to get Copilot token", response)

  return (await response.json()) as GetCopilotTokenResponse
}

// Trimmed for the sake of simplicity
interface GetCopilotTokenResponse {
  expires_at: number
  refresh_in: number
  token: string
}
