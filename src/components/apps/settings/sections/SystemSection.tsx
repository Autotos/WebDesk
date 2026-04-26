import { useState, useCallback } from 'react'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Download,
  RefreshCw,
  Power,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'
import {
  checkForUpdate,
  type UpdateCheckResult,
} from '@/lib/githubApi'
import {
  shutdownSystem,
  restartSystem,
  type ShutdownProgress,
} from '@/lib/systemOperations'

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
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
   Shutdown Overlay
   ================================================================ */

function ShutdownOverlay({ progress }: { progress: ShutdownProgress }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90">
      <Loader2 className="h-8 w-8 text-white animate-spin mb-4" />
      <p className="text-white text-[14px]">{progress.message}</p>
    </div>
  )
}

/* ================================================================
   Sub-section: System Update
   ================================================================ */

type CheckStatus = 'idle' | 'checking' | 'done' | 'error'

function SystemUpdateSection() {
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = useCallback(async () => {
    setStatus('checking')
    setError(null)
    setResult(null)
    try {
      const r = await checkForUpdate(__APP_VERSION__)
      setResult(r)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查更新失败')
      setStatus('error')
    }
  }, [])

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">系统升级</h3>

      <div className="rounded-lg border border-mac-border p-4 space-y-3">
        {/* Current version */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">当前版本</span>
          <span className="text-[12px] text-foreground font-mono">v{__APP_VERSION__}</span>
        </div>

        {/* Check button */}
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-colors',
            status === 'checking'
              ? 'bg-muted text-muted-foreground cursor-wait'
              : 'bg-mac-accent text-white hover:bg-mac-accent/90',
          )}
          disabled={status === 'checking'}
          onClick={handleCheck}
        >
          {status === 'checking' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在检查...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              检查更新
            </>
          )}
        </button>

        {/* Result: no update */}
        {status === 'done' && result && !result.hasUpdate && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-[12px] text-emerald-700">当前已是最新版本</p>
          </div>
        )}

        {/* Result: has update */}
        {status === 'done' && result?.hasUpdate && result.release && (
          <div className="space-y-3 p-3 rounded-lg bg-mac-accent/5 border border-mac-accent/20">
            <div className="flex items-start gap-2">
              <Download className="h-4 w-4 text-mac-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">
                  新版本可用: v{result.latestVersion}
                </p>
                {result.release.published_at && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    发布于 {formatDate(result.release.published_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Release notes (truncated) */}
            {result.release.body && (
              <div className="text-[11px] text-muted-foreground bg-background rounded-md p-2.5 max-h-32 overflow-auto scrollbar-thin border border-mac-border/50">
                <p className="font-medium text-foreground mb-1">更新日志</p>
                <pre className="whitespace-pre-wrap font-sans">
                  {result.release.body.slice(0, 500)}
                  {result.release.body.length > 500 ? '...' : ''}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={result.release.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-mac-accent text-white text-[12px] font-medium hover:bg-mac-accent/90 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                查看发布页
              </a>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-mac-border text-[12px] text-muted-foreground hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setStatus('idle')
                  setResult(null)
                }}
              >
                稍后提醒
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] text-destructive font-medium">检查更新失败</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   Sub-section: Power Controls
   ================================================================ */

function PowerControlsSection() {
  const [confirm, setConfirm] = useState<'shutdown' | 'restart' | null>(null)
  const [shutdownProgress, setShutdownProgress] = useState<ShutdownProgress | null>(null)

  const handleShutdown = useCallback(async () => {
    setConfirm(null)
    setShutdownProgress({ phase: 'closing-apps', message: '正在关闭...' })
    await shutdownSystem(setShutdownProgress)
  }, [])

  const handleRestart = useCallback(async () => {
    setConfirm(null)
    setShutdownProgress({ phase: 'closing-apps', message: '正在重启...' })
    await restartSystem(setShutdownProgress)
  }, [])

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">电源</h3>

      <div className="space-y-2">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-mac-border hover:bg-accent/50 transition-colors text-left"
          onClick={() => setConfirm('restart')}
        >
          <div className="w-8 h-8 rounded-lg bg-mac-accent/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4 text-mac-accent" />
          </div>
          <div>
            <p className="text-[13px] text-foreground font-medium">重启</p>
            <p className="text-[11px] text-muted-foreground">重新加载 WebDesk 系统</p>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors text-left"
          onClick={() => setConfirm('shutdown')}
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <Power className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-[13px] text-destructive font-medium">关机</p>
            <p className="text-[11px] text-muted-foreground">
              关闭所有应用并断开连接
            </p>
          </div>
        </button>
      </div>

      {/* Confirm dialogs */}
      {confirm === 'restart' && (
        <ConfirmDialog
          title="重启 WebDesk"
          message="确定要重启吗？所有未保存的工作将丢失。"
          confirmLabel="重启"
          onConfirm={handleRestart}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'shutdown' && (
        <ConfirmDialog
          title="关闭 WebDesk"
          message="确定要关机吗？所有应用将被关闭，WebSocket 连接将断开。"
          confirmLabel="关机"
          destructive
          onConfirm={handleShutdown}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Shutdown overlay */}
      {shutdownProgress && <ShutdownOverlay progress={shutdownProgress} />}
    </div>
  )
}

/* ================================================================
   Sub-section: Storage Management (preserved from original)
   ================================================================ */

function StorageSection() {
  const [entries, setEntries] = useState(getWebDeskStorageEntries)
  const [confirm, setConfirm] = useState<'reset' | 'clearAll' | 'deleteKey' | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const refresh = useCallback(() => setEntries(getWebDeskStorageEntries()), [])

  const handleDeleteKey = useCallback((key: string) => {
    setPendingKey(key)
    setConfirm('deleteKey')
  }, [])

  const executeAction = useCallback(() => {
    if (confirm === 'reset') {
      useSettingsStore.getState().resetAll()
    } else if (confirm === 'clearAll') {
      const keys: string[] = []
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

      {/* Quick actions */}
      <div className="mt-3 space-y-2">
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

      {/* Confirm dialogs */}
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

/* ================================================================
   Main Export
   ================================================================ */

export function SystemSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-[15px] font-semibold text-foreground">系统管理</h2>
      <SystemUpdateSection />
      <PowerControlsSection />
      <StorageSection />
    </div>
  )
}
