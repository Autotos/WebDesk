import { useState } from 'react'
import { PanelLeftOpen, PanelLeftClose, FolderOpen, Code } from 'lucide-react'
import { useCodeEditor } from './useCodeEditor'
import { useMarkdownPreview } from './useMarkdownPreview'
import { FileTreeView } from './FileTreeView'
import { EditorTabs } from './EditorTabs'
import { MonacoEditor } from './MonacoEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownViewToggle } from './MarkdownViewToggle'
import { EditorBreadcrumbs } from './EditorBreadcrumbs'
import { EditorStatusBar } from './EditorStatusBar'
import { ConflictBanner } from './ConflictBanner'

export function AndroidCodeEditor() {
  const editor = useCodeEditor()
  const [showSidebar, setShowSidebar] = useState(false)
  const mdPreview = useMarkdownPreview(
    editor.activeTab?.content ?? '',
    editor.activeTab?.language ?? '',
    true,
  )

  const showPreview = mdPreview.isMarkdown && mdPreview.viewMode === 'preview'

  return (
    <div className="flex flex-col h-full text-foreground relative">
      {/* Header */}
      <div className="flex items-center bg-mac-titlebar/50 border-b border-mac-border/30 shrink-0">
        {/* Hamburger button */}
        <button
          className="flex items-center justify-center w-10 h-full border-r border-mac-border/30"
          onClick={() => setShowSidebar(true)}
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Inline tabs */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
          <EditorTabs
            tabs={editor.tabs}
            activeTabId={editor.activeTabId}
            onSwitch={editor.switchTab}
            onClose={editor.closeTab}
            compact
          />
        </div>

        {/* Markdown view toggle (compact, no split) */}
        {mdPreview.isMarkdown && (
          <div className="shrink-0 border-l border-mac-border/30">
            <MarkdownViewToggle
              viewMode={mdPreview.viewMode}
              onViewModeChange={mdPreview.setViewMode}
              isMarkdown={mdPreview.isMarkdown}
              compact
            />
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {editor.activeTab && (
        <EditorBreadcrumbs
          fileName={editor.activeTab.name}
          breadcrumbs={editor.breadcrumbs}
          compact
        />
      )}

      {/* Conflict banner */}
      {editor.activeTab?.externallyModified && (
        <ConflictBanner tabId={editor.activeTab.id} onResolve={editor.resolveConflict} />
      )}

      {/* Editor / Preview area */}
      {editor.activeTab ? (
        showPreview ? (
          <MarkdownPreview html={mdPreview.renderedHtml} compact />
        ) : (
          <MonacoEditor
            key={editor.activeTabId}
            content={editor.activeTab.content}
            language={editor.activeTab.language}
            onChange={editor.updateContent}
            onSave={editor.saveActiveFile}
            onCursorChange={editor.updateCursorPos}
            onBreadcrumbsChange={editor.updateBreadcrumbs}
            compact
          />
        )
      ) : (
        <div className="flex-1 flex items-center justify-center bg-mac-window">
          <div className="text-center text-muted-foreground/50 px-6">
            <Code className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">Select a file to edit</p>
          </div>
        </div>
      )}

      {/* Status bar */}
      <EditorStatusBar
        language={editor.activeTab?.language ?? 'plaintext'}
        cursorPos={editor.cursorPos}
        isDirty={editor.activeTab?.isDirty ?? false}
        compact
      />

      {/* Sidebar overlay backdrop */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar overlay */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 z-30 bg-background shadow-xl flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between py-2.5 px-3 border-b border-mac-border/30">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Explorer
            </span>
            <button onClick={() => setShowSidebar(false)}>
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            </button>
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
              onSelectFile={(node) => {
                editor.openFile(node)
                if (node.type === 'file') setShowSidebar(false)
              }}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-mac-border/30 p-2.5">
            <div className="flex items-center gap-1.5 px-1 text-[12px] text-muted-foreground truncate">
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-mac-accent" />
              <span className="truncate">{editor.rootName || 'Root'}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Error banner */}
      {editor.treeError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive/90 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg z-50 max-w-xs text-center">
          {editor.treeError}
        </div>
      )}
    </div>
  )
}
