import { useState, useCallback } from 'react'
import { PanelLeftOpen, PanelLeftClose, Code } from 'lucide-react'
import { useCodeEditor } from './useCodeEditor'
import { useMarkdownPreview } from './useMarkdownPreview'
import { EditorTabs } from './EditorTabs'
import { MonacoEditor } from './MonacoEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownViewToggle } from './MarkdownViewToggle'
import { EditorBreadcrumbs } from './EditorBreadcrumbs'
import { EditorStatusBar } from './EditorStatusBar'
import { ConflictBanner } from './ConflictBanner'
import { MenuBar } from './ide/MenuBar'
import { ActivityBar } from './ide/ActivityBar'
import { SidePanel } from './ide/SidePanel'
import { ToastContainer } from './ide/ToastContainer'
import { FolderPickerDialog } from './ide/FolderPickerDialog'
import { TerminalPanel } from './terminal/TerminalPanel'
import { useIDEStore } from '@/store/useIDEStore'
import { useTerminalStore } from '@/store/useTerminalStore'
import type { editor as monacoEditor } from 'monaco-editor'

export function AndroidCodeEditor() {
  const editor = useCodeEditor()
  const [showSidebar, setShowSidebar] = useState(false)
  const activeSidePanel = useIDEStore((s) => s.activeSidePanel)
  const folderPickerOpen = useIDEStore((s) => s.folderPickerOpen)
  const setFolderPickerOpen = useIDEStore((s) => s.setFolderPickerOpen)
  const setWorkspaceRoot = useIDEStore((s) => s.setWorkspaceRoot)
  const terminalVisible = useTerminalStore((s) => s.terminalVisible)
  const [monacoInstance, setMonacoInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null)

  const mdPreview = useMarkdownPreview(
    editor.activeTab?.content ?? '',
    editor.activeTab?.language ?? '',
    true,
  )

  const showPreview = mdPreview.isMarkdown && mdPreview.viewMode === 'preview'

  const handleEditorReady = useCallback((ed: monacoEditor.IStandaloneCodeEditor) => {
    setMonacoInstance(ed)
  }, [])

  const handleCloseTab = useCallback(() => {
    if (editor.activeTabId) editor.closeTab(editor.activeTabId)
  }, [editor.activeTabId, editor.closeTab])

  const handleSelectFile = useCallback((node: Parameters<typeof editor.openFile>[0]) => {
    editor.openFile(node)
    if (node.type === 'file') setShowSidebar(false)
  }, [editor.openFile])

  const handleFolderSelect = useCallback((path: string) => {
    setWorkspaceRoot(path)
  }, [setWorkspaceRoot])

  return (
    <div className="flex flex-col h-full text-foreground relative">
      {/* Header */}
      <div className="flex items-center bg-mac-titlebar/50 border-b border-mac-border/30 shrink-0">
        {/* Hamburger button — opens sidebar with ActivityBar + panels */}
        <button
          className="flex items-center justify-center w-10 h-full border-r border-mac-border/30"
          onClick={() => setShowSidebar(true)}
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Menu button — compact MenuBar */}
        <MenuBar
          compact
          onSave={editor.saveActiveFile}
          onCloseTab={handleCloseTab}
          monacoEditor={monacoInstance}
        />

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

      {/* Editor / Preview / Terminal area */}
      {terminalVisible ? (
        /* When terminal is visible on mobile, it takes the full content area */
        <div className="flex-1 min-h-0">
          <TerminalPanel compact />
        </div>
      ) : editor.activeTab ? (
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
            onEditorReady={handleEditorReady}
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

      {/* Sidebar overlay — with ActivityBar + SidePanel */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 bottom-0 w-72 z-30 bg-background shadow-xl flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between py-2.5 px-3 border-b border-mac-border/30">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              WebDesk IDE
            </span>
            <button onClick={() => setShowSidebar(false)}>
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Horizontal ActivityBar */}
          <ActivityBar compact />

          {/* Panel content */}
          {activeSidePanel ? (
            <SidePanel
              treeNodes={editor.treeNodes}
              expandedDirs={editor.expandedDirs}
              loadingDirs={editor.loadingDirs}
              selectedFileId={editor.activeTabId}
              getChildren={editor.getChildren}
              onToggleDir={editor.toggleDir}
              onSelectFile={handleSelectFile}
              rootName={editor.rootName}
              workspaceRoot={editor.workspaceRoot}
              collapseAll={editor.collapseAll}
              refreshTree={editor.refreshTree}
              compact
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-[13px]">
              Select a panel above
            </div>
          )}
        </aside>
      )}

      {/* Toast notifications */}
      <ToastContainer />

      {/* Folder picker dialog */}
      <FolderPickerDialog
        open={folderPickerOpen}
        onClose={() => setFolderPickerOpen(false)}
        onSelect={handleFolderSelect}
      />

      {/* Error banner */}
      {editor.treeError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive/90 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg z-50 max-w-xs text-center">
          {editor.treeError}
        </div>
      )}
    </div>
  )
}
