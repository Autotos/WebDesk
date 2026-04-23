/**
 * Tracks file writes that originate from our own REST API,
 * so we can tag chokidar-detected changes as "self" and avoid
 * false conflict warnings on the frontend.
 */

const EXPIRY_MS = 2_000

export class SelfSaveTracker {
  private writes = new Map<string, number>()

  /** Record that we are about to write to this absolute path. */
  markSelfWrite(absolutePath: string): void {
    this.writes.set(absolutePath, Date.now())
  }

  /**
   * Check whether a chokidar event for this path was triggered by our own write.
   * If yes, consumes the mark and returns true.
   */
  consumeSelfWrite(absolutePath: string): boolean {
    const ts = this.writes.get(absolutePath)
    if (ts == null) return false

    if (Date.now() - ts < EXPIRY_MS) {
      this.writes.delete(absolutePath)
      return true
    }

    // Expired — clean up
    this.writes.delete(absolutePath)
    return false
  }
}
