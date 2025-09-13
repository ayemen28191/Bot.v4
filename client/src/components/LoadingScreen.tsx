import React, { useEffect, useState, useRef } from "react";
import { t } from "@/lib/i18n";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(t('loading'));
  const progressTimerRef = useRef<number | null>(null);
  const textTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const progressInterval = window.setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 98) {
          if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current);
          }
          return 100;
        }

        const increment = 
          prev < 30 ? Math.random() * 10 : 
          prev < 60 ? Math.random() * 5 : 
          prev < 85 ? Math.random() * 3 : 
          Math.random() * 0.5;

        return Math.min(prev + increment, 98);
      });
    }, 120);

    progressTimerRef.current = progressInterval;

    const textInterval = window.setInterval(() => {
      setLoadingText(current => {
        if (current.endsWith('...')) return t('loading');
        return current + '.';
      });
    }, 500);

    textTimerRef.current = textInterval;

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      if (textTimerRef.current) {
        window.clearInterval(textTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center max-w-md mx-auto px-4">
        <div className="relative">
          <div className="absolute inset-0 -left-2 -top-2 w-44 h-44 bg-yellow-400/20 rounded-full blur-md animate-pulse"></div>
          <div className="absolute inset-0 -right-2 -bottom-2 w-44 h-44 bg-blue-500/10 rounded-full blur-md animate-pulse" 
               style={{ animationDelay: '0.5s' }}></div>
          <img
            src="/robot-logo.svg"
            alt="ROBOT DATA"
            className="w-40 h-40 mb-4 relative z-10"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-primary">ROBOT DATA</h1>
        <p className="text-xl mb-8 text-muted-foreground">Binar Join Analytic</p>

        {message && (
          <p className="text-sm mb-4 text-center text-muted-foreground">{message}</p>
        )}

        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
          <div 
            className="h-full bg-primary transition-all duration-200 ease-out rounded-full"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-center mt-4">
          <div className="h-3 w-3 bg-primary rounded-full mr-1 animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="h-3 w-3 bg-primary rounded-full mr-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-3 w-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{loadingText}</p>

        {loadingProgress > 50 && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            {t('please_wait')}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;