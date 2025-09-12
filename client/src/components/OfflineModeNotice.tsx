import { AlertCircle, Wifi, WifiOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { t } from "@/lib/i18n"

interface OfflineModeNoticeProps {
  isOffline: boolean
  onToggle?: () => void
  httpsMode?: boolean
  className?: string
  variant?: 'default' | 'compact' | 'minimal'
}

export default function OfflineModeNotice({
  isOffline,
  onToggle,
  httpsMode = false,
  className = '',
  variant = 'default'
}: OfflineModeNoticeProps) {
  if (variant === 'minimal') {
    return (
      <Badge
        variant={isOffline ? "outline" : "secondary"}
        className={`gap-1 cursor-pointer hover:bg-secondary/80 transition-colors ${className}`}
        onClick={onToggle}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-3 w-3" />
            <span>{t('offline_mode')}</span>
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            <span>{t('online_mode')}</span>
          </>
        )}
      </Badge>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 ${
          isOffline ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'
        } ${className}`}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('offline_mode_active')}</span>
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 py-0.5 ml-1 text-[10px] rounded-sm text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/20"
                onClick={onToggle}
              >
                {t('disable')}
              </Button>
            )}
          </>
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('online_mode_active')}</span>
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 py-0.5 ml-1 text-[10px] rounded-sm text-green-600 hover:text-green-700 hover:bg-green-500/20"
                onClick={onToggle}
              >
                {t('go_offline')}
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <Alert
      variant={isOffline ? "destructive" : "default"}
      className={`${className} ${isOffline ? 'border-yellow-500/50 bg-yellow-500/10' : ''}`}
    >
      <AlertCircle className={`h-4 w-4 ${isOffline ? 'text-yellow-500' : ''}`} />
      <AlertTitle>
        {isOffline ? t('offline_mode_active') : t('online_mode_active')}
      </AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <span>
          {isOffline 
            ? httpsMode 
              ? t('offline_mode_https_description') 
              : t('offline_mode_description') 
            : t('online_mode_description')
          }
        </span>
        {onToggle && (
          <Button
            variant={isOffline ? "outline" : "secondary"}
            size="sm"
            className="ml-3"
            onClick={onToggle}
          >
            {isOffline ? t('go_online') : t('go_offline')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}