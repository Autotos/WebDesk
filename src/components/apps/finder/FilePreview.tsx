import { useState, useEffect, useCallback } from 'react'
import { X, Save, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type FsNode, isTextFile, isImageFile, FILE_ICON_MAP, FILE_COLOR_MAP, formatFileSize } from './fileSystem'
import type { UseFileSystemReturn } from '@/hooks/useFileSystem'

interface FilePreviewProps {
  node: FsNode
  fs: UseFileSystemReturn
  onClose: () => void
  /** Compact mode for mobile */
  compact?: boolean
}

export function FilePreview({ node, fs, onClose, compact }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canEdit = isTextFile(node.name)
  const isImage = isImageFile(node.name)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setContent(null)
    setEditing(false)

    async function load() {
      try {
        if (isImage) {
          // Image URL is synchronous — no loading needed
          if (!cancelled) setLoading(false)
        } else if (isTextFile(node.name)) {
          const text = await fs.readFileAsText(node)
          if (!cancelled) {
            setContent(text)
            setEditContent(text)
          }
        } else {
          // Unsupported preview — show info card
          if (!cancelled) setContent(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to read file')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [node, fs, isImage])

  const handleSave = useCallback(async () => {
    if (!canEdit) return
    setSaving(true)
    setSaved(false)
    try {
      await fs.writeFile(node, editContent)
      setContent(editContent)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [fs, node, editContent, canEdit])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = fs.getFileUrl(node)
    a.download = node.name
    a.click()
  }, [fs, node])

  const Icon = FILE_ICON_MAP[node.kind]
  const color = FILE_COLOR_MAP[node.kind]

  return (
    <div className={cn(
      'flex flex-col bg-background border-l border-mac-border/30',
      compact ? 'fixed inset-0 z-50' : 'w-[360px] shrink-0'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-mac-border/30 bg-mac-titlebar/40 shrink-0">
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <span className="flex-1 text-[12px] font-medium truncate">{node.name}</span>
        <div className="flex items-center gap-1">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] px-2 py-0.5 rounded bg-mac-accent/15 text-mac-accent hover:bg-mac-accent/25 transition-colors"
            >
              Edit
            </button>
          )}
          {editing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-mac-accent text-white hover:bg-mac-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
          <button onClick={handleDownload} className="p-1 rounded hover:bg-accent transition-colors" title="Download">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        ) : isImage ? (
          <div className="flex items-center justify-center p-4 h-full">
            <img src={fs.getFileUrl(node)} alt={node.name} className="max-w-full max-h-full object-contain rounded" />
          </div>
        ) : editing && content != null ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full p-3 text-[12px] font-mono leading-5 bg-transparent resize-none outline-none"
            spellCheck={false}
          />
        ) : content != null ? (
          <pre className="p-3 text-[12px] font-mono leading-5 whitespace-pre-wrap break-words">
            {content}
          </pre>
        ) : (
          /* File info card for unsupported types */
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <Icon className={cn('h-16 w-16', color)} strokeWidth={1} />
            <div className="text-center">
              <p className="text-sm font-medium">{node.name}</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}
                {node.size != null && ` \u00B7 ${formatFileSize(node.size)}`}
              </p>
              {node.modified && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Modified {node.modified}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
