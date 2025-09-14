
import { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';

interface ConnectionErrorProps {
  onRetry?: () => void;
  error?: Error | null;
  type?: 'network' | 'server' | 'websocket';
  message?: string;
  onEnableOfflineMode?: () => void;
  showOfflineModeOption?: boolean;
  autoRetry?: boolean;
  retryInterval?: number;
  className?: string;
}

export default function ConnectionError({ 
  onRetry, 
  error, 
  type = 'network',
  message,
  onEnableOfflineMode,
  showOfflineModeOption = false,
  autoRetry = false,
  retryInterval = 30,
  className = ''
}: ConnectionErrorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-retry functionality
  useEffect(() => {
    if (autoRetry && !isRetrying && autoRetryCount < 5) {
      const retryTimer = setTimeout(() => {
        if (!isOnline) {
          setAutoRetryCount(prev => prev + 1);
          handleRetry();
        }
      }, retryInterval * 1000);

      return () => clearTimeout(retryTimer);
    }
  }, [autoRetry, isRetrying, autoRetryCount, retryInterval, isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // محاولة إعادة تحميل الصفحة
        window.location.reload();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    if (!isOnline) return <WifiOff className="h-8 w-8 text-red-500" />;
    if (type === 'websocket') return <Wifi className="h-8 w-8 text-orange-500" />;
    return <AlertCircle className="h-8 w-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (!isOnline) return t('no_internet_connection');
    if (type === 'websocket') return t('websocket_connection_error');
    if (type === 'server') return t('server_connection_error');
    return t('connection_error');
  };

  const getErrorMessage = () => {
    // Use custom message if provided
    if (message) return message;
    
    if (!isOnline) return t('check_internet_connection');
    if (type === 'websocket') return t('websocket_connection_description');
    if (type === 'server') return t('server_unavailable');
    return error?.message || t('connection_error_description');
  };

  const handleEnableOfflineMode = () => {
    if (onEnableOfflineMode) {
      onEnableOfflineMode();
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-xl">
            {getErrorTitle()}
          </CardTitle>
          <CardDescription>
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* معلومات حالة الاتصال */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>{t('internet_connected')}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>{t('internet_disconnected')}</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="w-full"
              data-testid="button-retry-connection"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('retrying')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('retry_connection')}
                </>
              )}
            </Button>
            
            {showOfflineModeOption && onEnableOfflineMode && (
              <Button
                onClick={handleEnableOfflineMode}
                variant="outline"
                className="w-full"
                data-testid="button-enable-offline-mode"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                {t('enable_offline_mode')}
              </Button>
            )}
            
            {autoRetry && autoRetryCount > 0 && (
              <div className="text-center text-xs text-muted-foreground">
                {t('auto_retry_attempt')}: {autoRetryCount}/5
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
