import { useFileSync } from '@/hooks/useFileSync'
import { cn } from '@/lib/utils'

interface SyncStatusIndicatorProps {
  className?: string
}

export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const { isConnected } = useFileSync()

  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      title={isConnected ? 'Real-time sync active' : 'Sync disconnected'}
    >
      {/* Pulse ring (connected only) */}
      {isConnected && (
        <span className="absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75 animate-ping" />
      )}
      {/* Solid dot */}
      <span
        className={cn(
          'relative inline-flex h-1.5 w-1.5 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-gray-400',
        )}
      />
    </span>
  )
}
