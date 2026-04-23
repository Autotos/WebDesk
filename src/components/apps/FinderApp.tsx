import { useSystemTheme } from '@/hooks/useSystemTheme'
import { MacFinder } from './finder/MacFinder'
import { AndroidFinder } from './finder/AndroidFinder'

export function FinderApp() {
  const theme = useSystemTheme()
  return theme === 'mac' ? <MacFinder /> : <AndroidFinder />
}
