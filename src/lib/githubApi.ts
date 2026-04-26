/* ================================================================
   GitHub Releases API Service
   ================================================================ */

const GITHUB_API = 'https://api.github.com'

/** Configurable repo — change this when the real repo is set up */
const REPO_OWNER = 'webdesk'
const REPO_NAME = 'webdesk'

export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  published_at: string
  prerelease: boolean
  draft: boolean
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  release: GitHubRelease | null
}

/**
 * Compare two semver strings. Returns:
 *  1  if a > b
 *  0  if a === b
 * -1  if a < b
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * Fetch the latest non-draft, non-prerelease release from GitHub.
 * Throws on network errors or non-2xx responses.
 */
export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (res.status === 404) {
    // No releases yet
    return null
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<GitHubRelease>
}

/**
 * Check if a newer version is available on GitHub.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  const release = await fetchLatestRelease()

  if (!release) {
    return { hasUpdate: false, currentVersion, latestVersion: currentVersion, release: null }
  }

  const latestVersion = release.tag_name.replace(/^v/, '')
  const hasUpdate = compareSemver(latestVersion, currentVersion) > 0

  return { hasUpdate, currentVersion, latestVersion, release }
}
