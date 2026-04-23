import { useRef, useCallback, useEffect, useState } from 'react'
import { monaco } from './monacoSetup'

/* ================================================================
   Language ID mapping from our internal language names to Monaco
   ================================================================ */

const LANG_MAP: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  json: 'json',
  html: 'html',
  css: 'css',
  python: 'python',
  markdown: 'markdown',
  yaml: 'yaml',
  shell: 'shell',
  sql: 'sql',
  go: 'go',
  rust: 'rust',
  java: 'java',
  c: 'c',
  plaintext: 'plaintext',
}

function getMonacoLanguage(lang: string): string {
  return LANG_MAP[lang] ?? 'plaintext'
}

/* ================================================================
   Breadcrumb symbol type
   ================================================================ */

export interface BreadcrumbItem {
  name: string
  kind: string // 'function' | 'class' | 'interface' | 'variable' | 'module' etc.
  range: { startLine: number; endLine: number }
}

/* ================================================================
   MonacoEditor Component
   Replaces CodeArea with a full Monaco Editor instance
   ================================================================ */

interface MonacoEditorProps {
  content: string
  language: string
  onChange: (text: string) => void
  onSave: () => void
  onCursorChange: (line: number, col: number) => void
  onBreadcrumbsChange?: (breadcrumbs: BreadcrumbItem[]) => void
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void
  readOnly?: boolean
  compact?: boolean
}

export function MonacoEditor({
  content,
  language,
  onChange,
  onSave,
  onCursorChange,
  onBreadcrumbsChange,
  onEditorReady,
  readOnly,
  compact,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<monaco.editor.ITextModel | null>(null)
  const isUpdatingRef = useRef(false)
  const [ready, setReady] = useState(false)

  // Stable callback refs to avoid re-creating the editor
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange
  const onBreadcrumbsChangeRef = useRef(onBreadcrumbsChange)
  onBreadcrumbsChangeRef.current = onBreadcrumbsChange
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  // Initialize Monaco editor
  useEffect(() => {
    if (!containerRef.current) return

    const monacoLang = getMonacoLanguage(language)

    // Create model
    const uri = monaco.Uri.parse(`file:///editor/${Date.now()}.${language === 'typescript' ? 'tsx' : language === 'javascript' ? 'jsx' : language}`)
    const model = monaco.editor.createModel(content, monacoLang, uri)
    modelRef.current = model

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: 'vs',
      automaticLayout: true,
      minimap: { enabled: !compact },
      scrollBeyondLastLine: false,
      fontSize: compact ? 13 : 12,
      lineHeight: compact ? 22 : 20,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: compact ? 'on' : 'off',
      readOnly: readOnly ?? false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 8, bottom: 8 },
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      foldingStrategy: 'indentation',
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showVariables: true,
        showClasses: true,
        showInterfaces: true,
        showModules: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      parameterHints: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      // Mobile optimizations
      ...(compact ? {
        hover: { delay: 500 },
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 4,
          horizontalScrollbarSize: 4,
        },
      } : {}),
    })

    editorRef.current = editor
    setReady(true)
    onEditorReadyRef.current?.(editor)

    // --- Event listeners ---

    // Content change
    const contentDisposable = model.onDidChangeContent(() => {
      if (!isUpdatingRef.current) {
        onChangeRef.current(model.getValue())
      }
    })

    // Cursor position change
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current(e.position.lineNumber, e.position.column)
      // Update breadcrumbs
      updateBreadcrumbs(model, e.position)
    })

    // Register Ctrl+S / Cmd+S save action
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      ],
      run: () => {
        onSaveRef.current()
      },
    })

    // Register format document action
    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run()
      },
    })

    function updateBreadcrumbs(
      m: monaco.editor.ITextModel,
      pos: monaco.Position
    ) {
      if (!onBreadcrumbsChangeRef.current) return
      // Simple breadcrumb extraction from document symbols
      const breadcrumbs: BreadcrumbItem[] = []
      const lines = m.getLinesContent()
      // Walk backwards from cursor to find enclosing scopes
      for (let i = pos.lineNumber - 1; i >= 0; i--) {
        const line = lines[i]
        // Match function/class/interface/const declarations
        const funcMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
        const classMatch = line.match(/^\s*(?:export\s+)?class\s+(\w+)/)
        const ifaceMatch = line.match(/^\s*(?:export\s+)?(?:interface|type)\s+(\w+)/)
        const constMatch = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/)
        const componentMatch = line.match(/^\s*(?:export\s+)?(?:const|function)\s+(\w+).*(?:=>|{)/)

        if (funcMatch) {
          breadcrumbs.unshift({ name: funcMatch[1], kind: 'function', range: { startLine: i + 1, endLine: i + 1 } })
          break
        } else if (classMatch) {
          breadcrumbs.unshift({ name: classMatch[1], kind: 'class', range: { startLine: i + 1, endLine: i + 1 } })
          break
        } else if (ifaceMatch) {
          breadcrumbs.unshift({ name: ifaceMatch[1], kind: 'interface', range: { startLine: i + 1, endLine: i + 1 } })
          break
        } else if (constMatch) {
          breadcrumbs.unshift({ name: constMatch[1], kind: 'variable', range: { startLine: i + 1, endLine: i + 1 } })
          break
        } else if (componentMatch && breadcrumbs.length === 0) {
          breadcrumbs.unshift({ name: componentMatch[1], kind: 'component', range: { startLine: i + 1, endLine: i + 1 } })
          break
        }
      }
      onBreadcrumbsChangeRef.current(breadcrumbs)
    }

    // Cleanup
    return () => {
      contentDisposable.dispose()
      cursorDisposable.dispose()
      editor.dispose()
      model.dispose()
      editorRef.current = null
      modelRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Update content from outside (e.g. tab switch)
  useEffect(() => {
    const model = modelRef.current
    if (!model || !ready) return
    const currentValue = model.getValue()
    if (currentValue !== content) {
      isUpdatingRef.current = true
      model.setValue(content)
      isUpdatingRef.current = false
    }
  }, [content, ready])

  // Update language when it changes (tab switch)
  useEffect(() => {
    const model = modelRef.current
    if (!model || !ready) return
    const monacoLang = getMonacoLanguage(language)
    if (model.getLanguageId() !== monacoLang) {
      monaco.editor.setModelLanguage(model, monacoLang)
    }
  }, [language, ready])

  // Update readOnly state
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !ready) return
    editor.updateOptions({ readOnly: readOnly ?? false })
  }, [readOnly, ready])

  // Update compact/minimap settings
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !ready) return
    editor.updateOptions({
      minimap: { enabled: !compact },
      fontSize: compact ? 13 : 12,
      lineHeight: compact ? 22 : 20,
      wordWrap: compact ? 'on' : 'off',
    })
  }, [compact, ready])

  // Expose editor ref for parent components
  const getEditor = useCallback(() => editorRef.current, [])

  return (
    <div className="flex-1 relative overflow-hidden bg-mac-window">
      <div
        ref={containerRef}
        className="absolute inset-0"
        data-editor-ready={ready}
        data-get-editor={getEditor as unknown as string}
      />
    </div>
  )
}
