import { useSystemTheme } from '@/hooks/useSystemTheme'
import { MacCodeEditor } from './code-editor/MacCodeEditor'
import { AndroidCodeEditor } from './code-editor/AndroidCodeEditor'

export function CodeEditorApp() {
  const theme = useSystemTheme()
  return theme === 'mac' ? <MacCodeEditor /> : <AndroidCodeEditor />
}
