import { useRef, useState, useCallback } from 'react'
import { FolderOpen, Code } from 'lucide-react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useCodeEditor } from './useCodeEditor'
import { useMarkdownPreview } from './useMarkdownPreview'
import { useSyncScroll } from './useSyncScroll'
import { FileTreeView } from './FileTreeView'
import { EditorTabs } from './EditorTabs'
import { MonacoEditor } from './MonacoEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownViewToggle } from './MarkdownViewToggle'
import { EditorBreadcrumbs } from './EditorBreadcrumbs'
import { EditorStatusBar } from './EditorStatusBar'
import { ConflictBanner } from './ConflictBanner'

export function MacCodeEditor() {
  const editor = useCodeEditor()
  const mdPreview = useMarkdownPreview(
    editor.activeTab?.content ?? '',
    editor.activeTab?.language ?? '',
    false,
  )

  const showMonaco = !mdPreview.isMarkdown || mdPreview.viewMode !== 'preview'
  const showPreview = mdPreview.isMarkdown && mdPreview.viewMode !== 'edit'
  const isSplit = mdPreview.isMarkdown && mdPreview.viewMode === 'split'

  // Refs for sync scroll
  const previewRef = useRef<HTMLDivElement>(null)
  const [monacoInstance, setMonacoInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null)

  const handleEditorReady = useCallback((ed: monacoEditor.IStandaloneCodeEditor) => {
    setMonacoInstance(ed)
  }, [])

  useSyncScroll({
    editor: monacoInstance,
    previewEl: previewRef.current,
    enabled: isSplit,
  })

  return (
    <div className="flex h-full text-foreground">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-mac-sidebar/90 border-r border-mac-border/40 flex flex-col overflow-hidden">
        {/* Sidebar header */}
        <div className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <FileTreeView
            nodes={editor.treeNodes}
            expandedDirs={editor.expandedDirs}
            loadingDirs={editor.loadingDirs}
            selectedFileId={editor.activeTabId}
            getChildren={editor.getChildren}
            onToggleDir={editor.toggleDir}
            onSelectFile={editor.openFile}
            compact
          />
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-mac-border/30 p-2">
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground truncate">
            <FolderOpen className="h-3 w-3 shrink-0 text-mac-accent" />
            <span className="truncate">{editor.rootName || 'Root'}</span>
          </div>
        </div>
      </aside>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <EditorTabs
          tabs={editor.tabs}
          activeTabId={editor.activeTabId}
          onSwitch={editor.switchTab}
          onClose={editor.closeTab}
          compact={false}
        />

        {/* Markdown view toggle (only for .md files) */}
        <MarkdownViewToggle
          viewMode={mdPreview.viewMode}
          onViewModeChange={mdPreview.setViewMode}
          isMarkdown={mdPreview.isMarkdown}
        />

        {/* Breadcrumbs */}
        {editor.activeTab && (
          <EditorBreadcrumbs
            fileName={editor.activeTab.name}
            breadcrumbs={editor.breadcrumbs}
            compact={false}
          />
        )}

        {/* Conflict banner */}
        {editor.activeTab?.externallyModified && (
          <ConflictBanner tabId={editor.activeTab.id} onResolve={editor.resolveConflict} />
        )}

        {/* Editor / Preview area */}
        {editor.activeTab ? (
          <div className={`flex-1 flex min-h-0 ${isSplit ? 'flex-row' : 'flex-col'}`}>
            {showMonaco && (
              <div className={isSplit ? 'w-1/2 min-w-0 flex flex-col border-r border-mac-border/30' : 'flex-1 flex flex-col'}>
                <MonacoEditor
                  key={editor.activeTabId}
                  content={editor.activeTab.content}
                  language={editor.activeTab.language}
                  onChange={editor.updateContent}
                  onSave={editor.saveActiveFile}
                  onCursorChange={editor.updateCursorPos}
                  onBreadcrumbsChange={editor.updateBreadcrumbs}
                  onEditorReady={handleEditorReady}
                  compact={false}
                />
              </div>
            )}
            {showPreview && (
              <div className={isSplit ? 'w-1/2 min-w-0 flex flex-col' : 'flex-1 flex flex-col'}>
                <MarkdownPreview ref={previewRef} html={mdPreview.renderedHtml} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-mac-window">
            <div className="text-center text-muted-foreground/50">
              <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">Select a file to start editing</p>
            </div>
          </div>
        )}

        {/* Status bar */}
        <EditorStatusBar
          language={editor.activeTab?.language ?? 'plaintext'}
          cursorPos={editor.cursorPos}
          isDirty={editor.activeTab?.isDirty ?? false}
          compact={false}
        />
      </div>

      {/* Error banner */}
      {editor.treeError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive/90 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg z-50 max-w-xs text-center">
          {editor.treeError}
        </div>
      )}
    </div>
  )
}
