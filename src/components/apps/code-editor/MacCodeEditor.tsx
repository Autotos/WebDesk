import { useRef, useState, useCallback, useEffect } from 'react'
import { Code } from 'lucide-react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useCodeEditor } from './useCodeEditor'
import { useMarkdownPreview } from './useMarkdownPreview'
import { useSyncScroll } from './useSyncScroll'
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

export function MacCodeEditor() {
  const editor = useCodeEditor()
  const activeSidePanel = useIDEStore((s) => s.activeSidePanel)
  const folderPickerOpen = useIDEStore((s) => s.folderPickerOpen)
  const setFolderPickerOpen = useIDEStore((s) => s.setFolderPickerOpen)
  const setWorkspaceRoot = useIDEStore((s) => s.setWorkspaceRoot)

  const terminalVisible = useTerminalStore((s) => s.terminalVisible)
  const terminalPanelHeight = useTerminalStore((s) => s.terminalPanelHeight)
  const setTerminalPanelHeight = useTerminalStore((s) => s.setTerminalPanelHeight)

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

  const handleCloseTab = useCallback(() => {
    if (editor.activeTabId) editor.closeTab(editor.activeTabId)
  }, [editor.activeTabId, editor.closeTab])

  const handleFolderSelect = useCallback((path: string) => {
    setWorkspaceRoot(path)
  }, [setWorkspaceRoot])

  // Terminal panel resize handle
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startHeight.current = terminalPanelHeight
    e.preventDefault()
  }, [terminalPanelHeight])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      setTerminalPanelHeight(startHeight.current + delta)
    }
    const handleMouseUp = () => {
      isDragging.current = false
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setTerminalPanelHeight])

  return (
    <div className="flex flex-col h-full text-foreground relative">
      {/* Menu Bar */}
      <MenuBar
        onSave={editor.saveActiveFile}
        onCloseTab={handleCloseTab}
        monacoEditor={monacoInstance}
      />

      {/* Middle row: ActivityBar + SidePanel + Editor */}
      <div className="flex flex-1 min-h-0">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Side Panel */}
        {activeSidePanel && (
          <SidePanel
            treeNodes={editor.treeNodes}
            expandedDirs={editor.expandedDirs}
            loadingDirs={editor.loadingDirs}
            selectedFileId={editor.activeTabId}
            getChildren={editor.getChildren}
            onToggleDir={editor.toggleDir}
            onSelectFile={editor.openFile}
            rootName={editor.rootName}
            workspaceRoot={editor.workspaceRoot}
            collapseAll={editor.collapseAll}
            refreshTree={editor.refreshTree}
          />
        )}

        {/* Main content column: editor + terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor area */}
          <div className="flex-1 flex flex-col min-h-0">
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
          </div>

          {/* Terminal panel (bottom, resizable) */}
          {terminalVisible && (
            <>
              {/* Resize handle */}
              <div
                className="h-1 shrink-0 cursor-row-resize hover:bg-mac-accent/30 active:bg-mac-accent/50 transition-colors border-t border-mac-border/30"
                onMouseDown={handleResizeMouseDown}
              />
              {/* Terminal */}
              <div className="shrink-0 overflow-hidden" style={{ height: terminalPanelHeight }}>
                <TerminalPanel />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar — full width at bottom */}
      <EditorStatusBar
        language={editor.activeTab?.language ?? 'plaintext'}
        cursorPos={editor.cursorPos}
        isDirty={editor.activeTab?.isDirty ?? false}
        compact={false}
      />

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
