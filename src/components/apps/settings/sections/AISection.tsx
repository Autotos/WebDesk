import { useState, useCallback } from 'react'
import {
  Server,
  Cloud,
  Flame,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIStore, PROVIDER_PRESETS } from '@/store/useAIStore'
import { testConnection } from '@/lib/ai/aiService'
import type { AIProvider, AITestResult } from '@/lib/ai/types'

/* ================================================================
   Provider Cards
   ================================================================ */

const PROVIDER_OPTIONS: Array<{
  id: AIProvider
  icon: LucideIcon
}> = [
  { id: 'openai-compatible', icon: Server },
  { id: 'dashscope', icon: Cloud },
  { id: 'volcengine-ark', icon: Flame },
]

function ProviderSelector() {
  const provider = useAIStore((s) => s.provider)
  const setProvider = useAIStore((s) => s.setProvider)

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">AI 服务提供商</h3>
      <div className="grid gap-2">
        {PROVIDER_OPTIONS.map((opt) => {
          const preset = PROVIDER_PRESETS[opt.id]
          const Icon = opt.icon
          const isActive = provider === opt.id

          return (
            <button
              key={opt.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                isActive
                  ? 'bg-mac-accent/15 text-mac-accent ring-1 ring-mac-accent/30'
                  : 'hover:bg-accent text-foreground',
              )}
              onClick={() => setProvider(opt.id)}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isActive ? 'bg-mac-accent/20' : 'bg-muted',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-mac-accent' : 'text-muted-foreground')} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px] font-medium', isActive && 'text-mac-accent')}>
                  {preset.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{preset.subtitle}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   Connection Config Form
   ================================================================ */

function ConnectionConfig() {
  const provider = useAIStore((s) => s.provider)
  const baseUrl = useAIStore((s) => s.baseUrl)
  const apiKey = useAIStore((s) => s.apiKey)
  const modelName = useAIStore((s) => s.modelName)
  const setBaseUrl = useAIStore((s) => s.setBaseUrl)
  const setApiKey = useAIStore((s) => s.setApiKey)
  const setModelName = useAIStore((s) => s.setModelName)

  const [showKey, setShowKey] = useState(false)
  const preset = PROVIDER_PRESETS[provider]

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">连接配置</h3>

      <div className="rounded-lg border border-mac-border p-4 space-y-4">
        {/* Base URL */}
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1.5">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={preset.defaultUrl}
            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-mac-border/40 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-mac-accent/50 transition-shadow font-mono"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'openai-compatible' ? '(可选)' : 'sk-...'}
              className="w-full px-3 py-2 pr-10 rounded-lg bg-muted/50 border border-mac-border/40 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-mac-accent/50 transition-shadow font-mono"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{preset.placeholder.apiKeyHint}</p>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1.5">模型名称</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={preset.placeholder.model}
            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-mac-border/40 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-mac-accent/50 transition-shadow font-mono"
          />
        </div>

        {/* Security note */}
        <p className="text-[10px] text-muted-foreground border-t border-mac-border/30 pt-3">
          API Key 保存在本地浏览器中，所有 AI 请求均通过 WebDesk 后端代理转发，不会从浏览器直接发送至第三方。
        </p>
      </div>
    </div>
  )
}

/* ================================================================
   Connection Test
   ================================================================ */

type TestStatus = 'idle' | 'testing' | 'done'

function ConnectionTest() {
  const enabled = useAIStore((s) => s.enabled)
  const setEnabled = useAIStore((s) => s.setEnabled)
  const modelName = useAIStore((s) => s.modelName)
  const [status, setStatus] = useState<TestStatus>('idle')
  const [result, setResult] = useState<AITestResult | null>(null)

  const handleTest = useCallback(async () => {
    setStatus('testing')
    setResult(null)
    const r = await testConnection()
    setResult(r)
    setStatus('done')
    // Auto-enable on success
    if (r.success && !enabled) {
      setEnabled(true)
    }
  }, [enabled, setEnabled])

  const handleToggleEnabled = useCallback(() => {
    setEnabled(!enabled)
  }, [enabled, setEnabled])

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground mb-3">连接与状态</h3>

      <div className="space-y-3">
        {/* Test button */}
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-colors',
            status === 'testing'
              ? 'bg-muted text-muted-foreground cursor-wait'
              : 'bg-mac-accent text-white hover:bg-mac-accent/90',
          )}
          disabled={status === 'testing' || !modelName}
          onClick={handleTest}
        >
          {status === 'testing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在测试...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              测试连接
            </>
          )}
        </button>

        {!modelName && (
          <p className="text-[11px] text-muted-foreground text-center">请先填写模型名称</p>
        )}

        {/* Success result */}
        {status === 'done' && result?.success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700 font-medium">
                连接成功
                {result.latencyMs != null && (
                  <span className="font-normal text-emerald-600"> ({result.latencyMs}ms)</span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-emerald-600 pl-6 break-words">{result.message}</p>
          </div>
        )}

        {/* Error result */}
        {status === 'done' && result && !result.success && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1.5">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-[12px] text-destructive font-medium">连接失败</p>
            </div>
            <p className="text-[11px] text-muted-foreground pl-6 break-words">{result.message}</p>
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-mac-border">
          <div>
            <p className="text-[13px] text-foreground">启用 AI 服务</p>
            <p className="text-[11px] text-muted-foreground">
              {enabled ? '已启用 — 应用可调用 AI 功能' : '未启用'}
            </p>
          </div>
          <button
            className={cn(
              'relative w-10 h-6 rounded-full transition-colors shrink-0',
              enabled ? 'bg-mac-accent' : 'bg-muted-foreground/30',
            )}
            onClick={handleToggleEnabled}
          >
            <span
              className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Main Export
   ================================================================ */

export function AISection() {
  return (
    <div className="space-y-8">
      <h2 className="text-[15px] font-semibold text-foreground">AI 服务</h2>
      <ProviderSelector />
      <ConnectionConfig />
      <ConnectionTest />
    </div>
  )
}
