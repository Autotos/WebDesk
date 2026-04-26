import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIDEStore } from '@/store/useIDEStore'
import { useTerminalStore } from '@/store/useTerminalStore'
import type { editor as monacoEditor } from 'monaco-editor'

/* ================================================================
   Menu data types
   ================================================================ */

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  divider?: boolean
}

interface MenuDefinition {
  key: string
  label: string
  items: MenuItem[]
}

/* ================================================================
   Build menu definitions
   ================================================================ */

function buildMenus(opts: {
  onSave: () => void
  onCloseTab: () => void
  editor: monacoEditor.IStandaloneCodeEditor | null
  addToast: (msg: string) => void
  openFolderPicker: () => void
  closeWorkspace: () => void
}): MenuDefinition[] {
  const { onSave, onCloseTab, editor, addToast, openFolderPicker, closeWorkspace } = opts
  const todo = () => addToast('功能开发中')

  const editorAction = (actionId: string) => () => {
    if (editor) editor.trigger('menubar', actionId, null)
    else addToast('请先打开一个文件')
  }

  return [
    {
      key: 'file',
      label: '文件',
      items: [
        { label: '新建文件', shortcut: 'Ctrl+N', action: todo },
        { label: '打开文件', shortcut: 'Ctrl+O', action: todo },
        { label: '打开文件夹', action: openFolderPicker },
        { label: '从文件打开工作区', action: todo },
        { label: '将文件夹添加到工作区', action: todo },
        { label: '另存工作区', action: todo },
        { label: '', divider: true },
        { label: '保存', shortcut: 'Ctrl+S', action: onSave },
        { label: '另存为...', shortcut: 'Ctrl+Shift+S', action: todo },
        { label: '', divider: true },
        { label: '首选项', action: todo },
        { label: '', divider: true },
        { label: '关闭编辑器', action: onCloseTab },
        { label: '关闭文件夹', action: closeWorkspace },
        { label: '关闭窗口', action: todo },
        { label: '退出', action: todo },
      ],
    },
    {
      key: 'edit',
      label: '编辑',
      items: [
        { label: '撤销', shortcut: 'Ctrl+Z', action: editorAction('undo') },
        { label: '恢复', shortcut: 'Ctrl+Y', action: editorAction('redo') },
        { label: '', divider: true },
        { label: '剪切', shortcut: 'Ctrl+X', action: editorAction('editor.action.clipboardCutAction') },
        { label: '复制', shortcut: 'Ctrl+C', action: editorAction('editor.action.clipboardCopyAction') },
        { label: '粘贴', shortcut: 'Ctrl+V', action: todo },
        { label: '', divider: true },
        { label: '查找', shortcut: 'Ctrl+F', action: editorAction('actions.find') },
        { label: '替换', shortcut: 'Ctrl+H', action: editorAction('editor.action.startFindReplaceAction') },
        { label: '在文件中查找', action: todo },
        { label: '在文件中替换', action: todo },
      ],
    },
    {
      key: 'selection',
      label: '选择',
      items: [
        { label: '全选', shortcut: 'Ctrl+A', action: editorAction('editor.action.selectAll') },
        { label: '展开选择', shortcut: 'Shift+Alt+Right', action: editorAction('editor.action.smartSelect.expand') },
        { label: '收缩选择', shortcut: 'Shift+Alt+Left', action: editorAction('editor.action.smartSelect.shrink') },
        { label: '', divider: true },
        { label: '复制行（向上）', shortcut: 'Shift+Alt+Up', action: editorAction('editor.action.copyLinesUpAction') },
        { label: '复制行（向下）', shortcut: 'Shift+Alt+Down', action: editorAction('editor.action.copyLinesDownAction') },
        { label: '移动行（向上）', shortcut: 'Alt+Up', action: editorAction('editor.action.moveLinesUpAction') },
        { label: '移动行（向下）', shortcut: 'Alt+Down', action: editorAction('editor.action.moveLinesDownAction') },
      ],
    },
    {
      key: 'view',
      label: '查看',
      items: [
        { label: '命令面板...', shortcut: 'Ctrl+Shift+P', action: editorAction('editor.action.quickCommand') },
        { label: '打开视图...', action: todo },
        { label: '', divider: true },
        { label: '外观', action: todo },
        { label: '编辑器布局', action: todo },
        { label: '', divider: true },
        { label: '资源管理器', shortcut: 'F1', action: () => useIDEStore.getState().toggleSidePanel('explorer') },
        { label: '搜索', shortcut: 'Ctrl+Shift+F', action: () => useIDEStore.getState().toggleSidePanel('search') },
        { label: '源代码管理', shortcut: 'Ctrl+Shift+G', action: () => useIDEStore.getState().toggleSidePanel('scm') },
        { label: '运行', shortcut: 'Ctrl+Shift+D', action: () => useIDEStore.getState().toggleSidePanel('debug') },
        { label: '扩展', shortcut: 'Ctrl+Shift+X', action: () => useIDEStore.getState().toggleSidePanel('extensions') },
        { label: '', divider: true },
        { label: '问题', shortcut: 'Ctrl+Shift+M', action: todo },
        { label: '输出', shortcut: 'Ctrl+Shift+U', action: todo },
        { label: '调试控制台', action: todo },
        { label: '终端', shortcut: 'Ctrl+`', action: () => useTerminalStore.getState().toggleTerminal() },
        { label: '', divider: true },
        { label: '自动换行', action: () => {
          if (!editor) { addToast('请先打开一个文件'); return }
          const raw = editor.getRawOptions()
          editor.updateOptions({ wordWrap: raw.wordWrap === 'on' ? 'off' : 'on' })
        }},
      ],
    },
    {
      key: 'run',
      label: '运行',
      items: [
        { label: '启动调试', shortcut: 'F5', action: todo },
        { label: '以非调试模式运行', shortcut: 'Ctrl+F5', action: todo },
        { label: '停止调试', shortcut: 'Shift+F5', action: todo },
        { label: '重启调试', shortcut: 'Ctrl+Shift+F5', action: todo },
        { label: '', divider: true },
        { label: '打开配置', action: todo },
        { label: '添加配置', action: todo },
        { label: '', divider: true },
        { label: '逐过程', shortcut: 'F10', action: todo },
        { label: '单步执行', shortcut: 'F11', action: todo },
        { label: '单步停止', shortcut: 'Shift+F11', action: todo },
        { label: '继续', shortcut: 'F5', action: todo },
        { label: '', divider: true },
        { label: '切换断点', shortcut: 'F9', action: todo },
        { label: '新建断点', action: todo },
        { label: '启用所有断点', action: todo },
        { label: '禁用所有断点', action: todo },
        { label: '删除所有断点', action: todo },
      ],
    },
    {
      key: 'terminal',
      label: '终端',
      items: [
        {
          label: '新建终端',
          shortcut: 'Ctrl+Shift+`',
          action: () => useTerminalStore.getState().createTerminal(),
        },
        { label: '拆分终端', action: () => useTerminalStore.getState().splitTerminal() },
        { label: '新建终端窗口', action: () => useTerminalStore.getState().createTerminal() },
      ],
    },
    {
      key: 'help',
      label: '帮助',
      items: [
        { label: '显示所有命令', action: editorAction('editor.action.quickCommand') },
        { label: '文档', action: todo },
        { label: '显示发行说明', action: todo },
        { label: '', divider: true },
        { label: '查看许可证', action: todo },
        { label: '隐私声明', action: todo },
        { label: '', divider: true },
        { label: '切换开发人员工具', shortcut: 'F12', action: todo },
        { label: '打开进程资源管理器', action: todo },
        { label: '检查更新...', action: todo },
        { label: '', divider: true },
        { label: '关于', action: todo },
      ],
    },
  ]
}

/* ================================================================
   MenuBar Component
   ================================================================ */

interface MenuBarProps {
  compact?: boolean
  onSave: () => void
  onCloseTab: () => void
  monacoEditor: monacoEditor.IStandaloneCodeEditor | null
}

export function MenuBar({ compact, onSave, onCloseTab, monacoEditor: editor }: MenuBarProps) {
  const addToast = useIDEStore((s) => s.addToast)
  const activeMenu = useIDEStore((s) => s.activeMenu)
  const setActiveMenu = useIDEStore((s) => s.setActiveMenu)
  const setFolderPickerOpen = useIDEStore((s) => s.setFolderPickerOpen)
  const setWorkspaceRoot = useIDEStore((s) => s.setWorkspaceRoot)

  const openFolderPicker = useCallback(() => setFolderPickerOpen(true), [setFolderPickerOpen])
  const closeWorkspace = useCallback(() => setWorkspaceRoot(null), [setWorkspaceRoot])

  const menus = buildMenus({ onSave, onCloseTab, editor, addToast, openFolderPicker, closeWorkspace })
  const menuBarRef = useRef<HTMLDivElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close menu on outside click
  useEffect(() => {
    if (!activeMenu && !mobileMenuOpen) return

    const handleClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activeMenu, mobileMenuOpen, setActiveMenu])

  const handleMenuItemClick = useCallback((item: MenuItem) => {
    if (item.action) item.action()
    setActiveMenu(null)
    setMobileMenuOpen(false)
  }, [setActiveMenu])

  // Mobile compact mode
  if (compact) {
    return (
      <div ref={menuBarRef} className="relative">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-center w-10 h-full border-r border-mac-border/30"
        >
          <Menu className="h-4 w-4 text-muted-foreground" />
        </button>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 z-50 w-64 max-h-[70vh] overflow-auto bg-popover border border-mac-border/40 rounded-md shadow-lg py-1">
            {menus.map((menu) => (
              <div key={menu.key}>
                <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {menu.label}
                </div>
                {menu.items.map((item, i) =>
                  item.divider ? (
                    <div key={`${menu.key}-d-${i}`} className="my-0.5 mx-2 border-t border-mac-border/30" />
                  ) : (
                    <button
                      key={`${menu.key}-${i}`}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-mac-accent hover:text-white transition-colors"
                      onClick={() => handleMenuItemClick(item)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-muted-foreground ml-4">{item.shortcut}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop mode
  return (
    <div
      ref={menuBarRef}
      className="h-8 shrink-0 flex items-center bg-mac-titlebar/50 border-b border-mac-border/30 px-1 text-[12px] select-none"
    >
      {menus.map((menu) => (
        <div key={menu.key} className="relative">
          <button
            className={cn(
              'px-2.5 py-1 rounded-sm transition-colors',
              activeMenu === menu.key
                ? 'bg-mac-accent text-white'
                : 'text-foreground/80 hover:bg-accent/60',
            )}
            onClick={() => setActiveMenu(activeMenu === menu.key ? null : menu.key)}
            onMouseEnter={() => {
              if (activeMenu && activeMenu !== menu.key) setActiveMenu(menu.key)
            }}
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {activeMenu === menu.key && (
            <div className="absolute top-full left-0 z-50 min-w-[220px] bg-popover border border-mac-border/40 rounded-md shadow-lg py-1 mt-0.5">
              {menu.items.map((item, i) =>
                item.divider ? (
                  <div key={`d-${i}`} className="my-0.5 mx-2 border-t border-mac-border/30" />
                ) : (
                  <button
                    key={`${menu.key}-${i}`}
                    className="w-full flex items-center justify-between px-3 py-1 text-[12px] hover:bg-mac-accent hover:text-white transition-colors"
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] text-muted-foreground ml-6 opacity-70">{item.shortcut}</span>
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
