import { useState, useCallback } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'

/* ================================================================
   Helpers
   ================================================================ */

function getWebDeskStorageEntries(): { key: string; sizeKB: string }[] {
  const entries: { key: string; sizeKB: string }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('webdesk-')) {
      const val = localStorage.getItem(key) ?? ''
      const sizeKB = ((val.length * 2) / 1024).toFixed(1)
      entries.push({ key, sizeKB })
    }
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

/* ================================================================
   Confirm Dialog
   ================================================================ */

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-lg p-5 max-w-sm w-full mx-4 border border-mac-border">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle
            className={cn(
              'h-5 w-5 shrink-0 mt-0.5',
              destructive ? 'text-destructive' : 'text-mac-accent',
            )}
          />
          <div>
            <p className="text-[14px] font-semibold text-foreground">{title}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-[12px] rounded-lg hover:bg-accent transition-colors text-foreground"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-[12px] rounded-lg text-white transition-colors',
              destructive
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-mac-accent hover:bg-mac-accent/90',
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function SystemSection() {
  const [entries, setEntries] = useState(getWebDeskStorageEntries)
  const [confirm, setConfirm] = useState<'reset' | 'clearAll' | 'deleteKey' | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const refresh = useCallback(() => setEntries(getWebDeskStorageEntries()), [])

  const handleDeleteKey = useCallback(
    (key: string) => {
      setPendingKey(key)
      setConfirm('deleteKey')
    },
    [],
  )

  const executeAction = useCallback(() => {
    if (confirm === 'reset') {
      useSettingsStore.getState().resetAll()
    } else if (confirm === 'clearAll') {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('webdesk-')) keys.push(key)
      }
      keys.forEach((k) => localStorage.removeItem(k))
      window.location.reload()
      return
    } else if (confirm === 'deleteKey' && pendingKey) {
      localStorage.removeItem(pendingKey)
    }
    setConfirm(null)
    setPendingKey(null)
    refresh()
  }, [confirm, pendingKey, refresh])

  const totalKB = entries.reduce((sum, e) => sum + parseFloat(e.sizeKB), 0).toFixed(1)

  return (
    <div className="space-y-6">
      <h2 className="text-[15px] font-semibold text-foreground">系统管理</h2>

      {/* Storage management */}
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-2">
          本地存储 <span className="text-muted-foreground font-normal">({totalKB} KB)</span>
        </h3>

        {entries.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">暂无 WebDesk 数据</p>
        ) : (
          <div className="rounded-lg border border-mac-border overflow-hidden">
            {entries.map((entry, i) => (
              <div
                key={entry.key}
                className={cn(
                  'flex items-center justify-between px-3 py-2',
                  i < entries.length - 1 && 'border-b border-mac-border/50',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-foreground font-mono truncate">{entry.key}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.sizeKB} KB</p>
                </div>
                <button
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2"
                  title="删除此项"
                  onClick={() => handleDeleteKey(entry.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-mac-border hover:bg-accent/50 transition-colors text-left"
          onClick={() => setConfirm('reset')}
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[13px] text-foreground">重置所有设置</p>
            <p className="text-[11px] text-muted-foreground">恢复个性化设置为默认值</p>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors text-left"
          onClick={() => setConfirm('clearAll')}
        >
          <Trash2 className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-[13px] text-destructive">清除所有 WebDesk 数据</p>
            <p className="text-[11px] text-muted-foreground">
              删除所有本地存储数据并重新加载页面
            </p>
          </div>
        </button>
      </div>

      {/* Confirm dialog */}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="重置设置"
          message="确定要将所有个性化设置恢复为默认值吗？"
          confirmLabel="重置"
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'clearAll' && (
        <ConfirmDialog
          title="清除所有数据"
          message="这将删除所有 WebDesk 本地数据（包括 IDE 布局、终端设置等），页面将自动重新加载。此操作不可撤销。"
          confirmLabel="全部清除"
          destructive
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'deleteKey' && pendingKey && (
        <ConfirmDialog
          title="删除数据"
          message={`确定要删除 "${pendingKey}" 吗？`}
          confirmLabel="删除"
          destructive
          onConfirm={executeAction}
          onCancel={() => {
            setConfirm(null)
            setPendingKey(null)
          }}
        />
      )}
    </div>
  )
}
