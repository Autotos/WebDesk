import { Router } from 'express'
import path from 'node:path'
import * as fsService from '../services/fsService.js'
import { ForbiddenError, resolveSafePath, validateName } from '../utils/pathSecurity.js'

export function createFsRouter(
  rootDir: string,
  onSelfWrite?: (absolutePath: string) => void,
): Router {
  const router = Router()

  /* ----------------------------------------------------------
     Error helper
     ---------------------------------------------------------- */
  function handleError(err: unknown, res: import('express').Response) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message })
      return
    }

    const e = err as NodeJS.ErrnoException
    if (e.code === 'ENOENT') {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (e.code === 'EEXIST') {
      res.status(409).json({ error: 'Already exists' })
      return
    }
    if (e.code === 'PAYLOAD_TOO_LARGE') {
      res.status(413).json({ error: e.message })
      return
    }

    console.error('[fs]', e.message)
    res.status(500).json({ error: e.message || 'Internal server error' })
  }

  /** Mark a path as self-write for the file watcher to detect. */
  function markSelf(absolutePath: string) {
    onSelfWrite?.(absolutePath)
  }

  /* ----------------------------------------------------------
     GET /api/fs/list?path=/
     ---------------------------------------------------------- */
  router.get('/list', async (req, res) => {
    try {
      const dirPath = (req.query.path as string) || '/'
      const result = await fsService.listDirectory(dirPath, rootDir)
      res.json(result)
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     GET /api/fs/read?path=/file.txt
     ---------------------------------------------------------- */
  router.get('/read', async (req, res) => {
    try {
      const filePath = req.query.path as string
      if (!filePath) {
        res.status(400).json({ error: 'Missing path parameter' })
        return
      }
      const content = await fsService.readFileAsText(filePath, rootDir)
      res.json({ content })
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     GET /api/fs/file/* — serve binary (images, downloads, etc.)
     Uses wildcard so the path can be used as <img src>.
     ---------------------------------------------------------- */
  router.get('/file/*', (req, res) => {
    try {
      // Extract the relative path from URL — strip the "/file/" prefix
      const filePath = '/' + req.path.replace(/^\/file\//, '')
      const absolutePath = fsService.getAbsolutePath(filePath, rootDir)
      res.sendFile(absolutePath)
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/fs/write  { path, content }
     ---------------------------------------------------------- */
  router.post('/write', async (req, res) => {
    try {
      const { path: filePath, content } = req.body as { path: string; content: string }
      if (!filePath || content == null) {
        res.status(400).json({ error: 'Missing path or content' })
        return
      }
      await fsService.writeFile(filePath, content, rootDir)
      markSelf(fsService.getAbsolutePath(filePath, rootDir))
      res.json({ ok: true })
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/fs/mkdir  { path, name }
     ---------------------------------------------------------- */
  router.post('/mkdir', async (req, res) => {
    try {
      const { path: dirPath, name } = req.body as { path: string; name: string }
      if (!dirPath || !name) {
        res.status(400).json({ error: 'Missing path or name' })
        return
      }
      await fsService.createFolder(dirPath, name, rootDir)
      // Mark the new directory
      validateName(name)
      const parentAbs = resolveSafePath(dirPath, rootDir)
      markSelf(path.join(parentAbs, name))
      res.json({ ok: true })
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/fs/touch  { path, name }
     ---------------------------------------------------------- */
  router.post('/touch', async (req, res) => {
    try {
      const { path: dirPath, name } = req.body as { path: string; name: string }
      if (!dirPath || !name) {
        res.status(400).json({ error: 'Missing path or name' })
        return
      }
      await fsService.createFile(dirPath, name, rootDir)
      validateName(name)
      const parentAbs = resolveSafePath(dirPath, rootDir)
      markSelf(path.join(parentAbs, name))
      res.json({ ok: true })
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/fs/delete  { path }
     ---------------------------------------------------------- */
  router.post('/delete', async (req, res) => {
    try {
      const { path: entryPath } = req.body as { path: string }
      if (!entryPath) {
        res.status(400).json({ error: 'Missing path' })
        return
      }
      const absolutePath = fsService.getAbsolutePath(entryPath, rootDir)
      markSelf(absolutePath)
      await fsService.deleteEntry(entryPath, rootDir)
      res.json({ ok: true })
    } catch (err) {
      handleError(err, res)
    }
  })

  /* ----------------------------------------------------------
     POST /api/fs/rename  { path, newName }
     ---------------------------------------------------------- */
  router.post('/rename', async (req, res) => {
    try {
      const { path: entryPath, newName } = req.body as { path: string; newName: string }
      if (!entryPath || !newName) {
        res.status(400).json({ error: 'Missing path or newName' })
        return
      }
      const oldAbsolute = fsService.getAbsolutePath(entryPath, rootDir)
      // Mark old path (unlink event) and new path (add event)
      markSelf(oldAbsolute)
      validateName(newName)
      markSelf(path.join(path.dirname(oldAbsolute), newName))
      await fsService.renameEntry(entryPath, newName, rootDir)
      res.json({ ok: true })
    } catch (err) {
      handleError(err, res)
    }
  })

  return router
}
