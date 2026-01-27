import type { GitHubUser } from "~/lib/state"

import { GITHUB_API_BASE_URL, standardHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/error"
import { fetchWithTimeout } from "~/lib/fetch-with-timeout"
import { state } from "~/lib/state"

// Timeout for user requests (10 seconds)
const USER_REQUEST_TIMEOUT = 10000

export async function getGitHubUser(token?: string): Promise<GitHubUser> {
  const authToken = token ?? state.githubToken
  const response = await fetchWithTimeout(`${GITHUB_API_BASE_URL}/user`, {
    headers: {
      authorization: `token ${authToken}`,
      ...standardHeaders(),
    },
    timeout: USER_REQUEST_TIMEOUT,
  })

  if (!response.ok) throw new HTTPError("Failed to get GitHub user", response)

  return (await response.json()) as GitHubUser
}
