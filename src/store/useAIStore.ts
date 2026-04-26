import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIProvider } from '@/lib/ai/types'

/* ================================================================
   Provider URL Presets
   ================================================================ */

export const PROVIDER_PRESETS: Record<AIProvider, { label: string; subtitle: string; defaultUrl: string; placeholder: { model: string; apiKeyHint: string } }> = {
  'openai-compatible': {
    label: 'OpenAI 兼容',
    subtitle: 'Ollama, LM Studio, Llama.cpp 等',
    defaultUrl: 'http://localhost:11434',
    placeholder: { model: 'qwen2:7b', apiKeyHint: '本地 Ollama 通常不需要 API Key' },
  },
  dashscope: {
    label: '阿里百炼',
    subtitle: '通义千问系列模型',
    defaultUrl: 'https://dashscope.aliyuncs.com',
    placeholder: { model: 'qwen-turbo', apiKeyHint: '从阿里云百炼控制台获取 API Key' },
  },
  'volcengine-ark': {
    label: '火山方舟',
    subtitle: '豆包系列模型',
    defaultUrl: 'https://ark.cn-beijing.volces.com',
    placeholder: { model: 'doubao-pro-4k', apiKeyHint: '从火山引擎控制台获取 API Key' },
  },
}

const PRESET_URLS = new Set(Object.values(PROVIDER_PRESETS).map((p) => p.defaultUrl))

/* ================================================================
   Defaults
   ================================================================ */

const DEFAULTS = {
  provider: 'openai-compatible' as AIProvider,
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  modelName: '',
  enabled: false,
}

/* ================================================================
   Store
   ================================================================ */

interface AIState {
  provider: AIProvider
  baseUrl: string
  apiKey: string
  modelName: string
  enabled: boolean

  setProvider: (provider: AIProvider) => void
  setBaseUrl: (url: string) => void
  setApiKey: (key: string) => void
  setModelName: (name: string) => void
  setEnabled: (enabled: boolean) => void
  resetAll: () => void
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setProvider: (provider) => {
        const current = get()
        const shouldAutoFill = !current.baseUrl || PRESET_URLS.has(current.baseUrl)
        set({
          provider,
          ...(shouldAutoFill ? { baseUrl: PROVIDER_PRESETS[provider].defaultUrl } : {}),
        })
      },

      setBaseUrl: (url) => set({ baseUrl: url }),
      setApiKey: (key) => set({ apiKey: key }),
      setModelName: (name) => set({ modelName: name }),
      setEnabled: (enabled) => set({ enabled }),
      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'webdesk-ai',
      partialize: (state) => ({
        provider: state.provider,
        baseUrl: state.baseUrl,
        apiKey: state.apiKey,
        modelName: state.modelName,
        enabled: state.enabled,
      }),
    },
  ),
)
