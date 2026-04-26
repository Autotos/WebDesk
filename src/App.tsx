import { useSystemTheme } from '@/hooks/useSystemTheme'
import { useSettingsEffect } from '@/hooks/useSettingsEffect'
import { MacDesktop } from '@/components/mac/MacDesktop'
import { AndroidDesktop } from '@/components/android/AndroidDesktop'

function App() {
  const theme = useSystemTheme()
  useSettingsEffect()

  return (
    <div className="w-full h-full">
      {theme === 'mac' ? <MacDesktop /> : <AndroidDesktop />}
    </div>
  )
}

export default App
