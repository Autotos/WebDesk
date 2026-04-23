import path from 'node:path'

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Resolve a user-supplied relative path against rootDir,
 * ensuring the result stays within the sandbox.
 */
export function resolveSafePath(relativePath: string, rootDir: string): string {
  // Normalize: strip leading slashes, convert backslashes
  const normalized = relativePath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')

  const resolved = path.resolve(rootDir, normalized)
  const normalizedRoot = path.resolve(rootDir)

  // The resolved path must be equal to or inside rootDir
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new ForbiddenError(`Path escapes sandbox: ${relativePath}`)
  }

  return resolved
}

/**
 * Convert an absolute path back to a forward-slash relative path for API responses.
 * Always starts with "/" (root = "/").
 */
export function toRelativePath(absolutePath: string, rootDir: string): string {
  const normalizedRoot = path.resolve(rootDir)
  const resolved = path.resolve(absolutePath)

  if (resolved === normalizedRoot) return '/'

  const rel = path.relative(normalizedRoot, resolved)
  // Normalize to forward slashes
  return '/' + rel.split(path.sep).join('/')
}

/**
 * Validate a file/folder name. Reject dangerous characters.
 */
export function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ForbiddenError('Name cannot be empty')
  }
  if (name.includes('/') || name.includes('\\')) {
    throw new ForbiddenError('Name cannot contain path separators')
  }
  if (name === '.' || name === '..') {
    throw new ForbiddenError('Name cannot be "." or ".."')
  }
  if (name.includes('..')) {
    throw new ForbiddenError('Name cannot contain ".."')
  }
}
