import type { FsNode } from '@/components/apps/finder/fileSystem'

/* ================================================================
   Backend File System API Client
   All file operations go through these functions.
   ================================================================ */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

/* ---- Read operations ---- */

export async function listDirectory(
  dirPath: string,
): Promise<{ entries: FsNode[]; rootName: string }> {
  return request(`/api/fs/list?path=${encodeURIComponent(dirPath)}`)
}

export async function readFileAsText(filePath: string): Promise<string> {
  const data = await request<{ content: string }>(
    `/api/fs/read?path=${encodeURIComponent(filePath)}`,
  )
  return data.content
}

/**
 * Get a URL that serves the file binary (for images, downloads, etc.).
 * Synchronous — just builds the URL string.
 */
export function getFileUrl(filePath: string): string {
  // Strip leading slash for the URL path segment
  const normalized = filePath.replace(/^\/+/, '')
  return `/api/fs/file/${normalized}`
}

/* ---- Write operations ---- */

export async function writeFile(
  filePath: string,
  content: string,
): Promise<void> {
  await request('/api/fs/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content }),
  })
}

export async function createFolder(
  dirPath: string,
  name: string,
): Promise<void> {
  await request('/api/fs/mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath, name }),
  })
}

export async function createFile(
  dirPath: string,
  name: string,
): Promise<void> {
  await request('/api/fs/touch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath, name }),
  })
}

export async function deleteEntry(entryPath: string): Promise<void> {
  await request('/api/fs/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: entryPath }),
  })
}

export async function renameEntry(
  entryPath: string,
  newName: string,
): Promise<void> {
  await request('/api/fs/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: entryPath, newName }),
  })
}
