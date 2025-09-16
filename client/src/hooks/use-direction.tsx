import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { safeGetLocalStorageString, safeSetLocalStorageString } from '@/lib/storage-utils';

export type Direction = 'ltr' | 'rtl';
export type Language = 'en' | 'ar';

interface DirectionConfig {
  direction: Direction;
  language: Language;
  isRTL: boolean;
}

interface DirectionProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

interface DirectionProviderState extends DirectionConfig {
  setLanguage: (language: Language) => void;
  setDirection: (direction: Direction) => void;
  toggleDirection: () => void;
}

const LANGUAGE_TO_DIRECTION_MAP: Record<Language, Direction> = {
  'ar': 'rtl',
  'en': 'ltr'
};

const DIRECTION_STORAGE_KEY = 'app-direction';
const LANGUAGE_STORAGE_KEY = 'app-language';

// Default state
const getDefaultConfig = (): DirectionConfig => ({
  direction: 'rtl',
  language: 'ar',
  isRTL: true
});

const initialState: DirectionProviderState = {
  ...getDefaultConfig(),
  setLanguage: () => null,
  setDirection: () => null,
  toggleDirection: () => null,
};

const DirectionProviderContext = createContext<DirectionProviderState>(initialState);

/**
 * Load stored preferences or use defaults
 */
function getStoredConfig(): DirectionConfig {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  try {
    const storedLanguage = safeGetLocalStorageString(LANGUAGE_STORAGE_KEY) as Language;
    const storedDirection = safeGetLocalStorageString(DIRECTION_STORAGE_KEY) as Direction;
    
    // If we have stored language, derive direction from it
    if (storedLanguage && ['en', 'ar'].includes(storedLanguage)) {
      const direction = LANGUAGE_TO_DIRECTION_MAP[storedLanguage];
      return {
        direction,
        language: storedLanguage,
        isRTL: direction === 'rtl'
      };
    }
    
    // If we only have stored direction
    if (storedDirection && ['ltr', 'rtl'].includes(storedDirection)) {
      const language: Language = storedDirection === 'rtl' ? 'ar' : 'en';
      return {
        direction: storedDirection,
        language,
        isRTL: storedDirection === 'rtl'
      };
    }
  } catch (error) {
    console.warn('Error reading direction/language from storage:', error);
  }

  return getDefaultConfig();
}

/**
 * Apply direction and language to document
 */
function applyToDocument(config: DirectionConfig): void {
  if (typeof window === 'undefined') return;

  const { direction, language } = config;
  
  console.log(`🌍 DirectionProvider: Applying ${language} (${direction}) to document`);
  
  // Apply to document element
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', language);
  
  // Store preferences
  try {
    safeSetLocalStorageString(DIRECTION_STORAGE_KEY, direction);
    safeSetLocalStorageString(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Error storing direction/language preferences:', error);
  }
}

/**
 * DirectionProvider - Single source of truth for direction and language
 */
export function DirectionProvider({
  children,
  defaultLanguage,
}: DirectionProviderProps) {
  
  const [config, setConfig] = useState<DirectionConfig>(() => {
    const stored = getStoredConfig();
    
    // Override with defaultLanguage if provided
    if (defaultLanguage && defaultLanguage !== stored.language) {
      const direction = LANGUAGE_TO_DIRECTION_MAP[defaultLanguage];
      return {
        direction,
        language: defaultLanguage,
        isRTL: direction === 'rtl'
      };
    }
    
    return stored;
  });

  // Apply to document on mount and when config changes
  useEffect(() => {
    applyToDocument(config);
  }, [config]);

  const setLanguage = (language: Language) => {
    const direction = LANGUAGE_TO_DIRECTION_MAP[language];
    const newConfig: DirectionConfig = {
      direction,
      language,
      isRTL: direction === 'rtl'
    };
    
    console.log(`🌍 DirectionProvider: Language changed to ${language} (${direction})`);
    setConfig(newConfig);
  };

  const setDirection = (direction: Direction) => {
    const language: Language = direction === 'rtl' ? 'ar' : 'en';
    const newConfig: DirectionConfig = {
      direction,
      language,
      isRTL: direction === 'rtl'
    };
    
    console.log(`🌍 DirectionProvider: Direction changed to ${direction} (${language})`);
    setConfig(newConfig);
  };

  const toggleDirection = () => {
    const newDirection: Direction = config.direction === 'rtl' ? 'ltr' : 'rtl';
    setDirection(newDirection);
  };

  const value: DirectionProviderState = {
    ...config,
    setLanguage,
    setDirection,
    toggleDirection,
  };

  return (
    <DirectionProviderContext.Provider value={value}>
      {children}
    </DirectionProviderContext.Provider>
  );
}

/**
 * Hook to access direction context
 */
export const useDirection = () => {
  const context = useContext(DirectionProviderContext);

  if (context === undefined) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }

  return context;
};

/**
 * Utility hook for RTL-specific logic
 */
export const useRTLUtils = () => {
  const { direction, isRTL } = useDirection();

  return {
    direction,
    isRTL,
    // Margin utilities
    marginStart: (value: string) => isRTL ? { marginRight: value } : { marginLeft: value },
    marginEnd: (value: string) => isRTL ? { marginLeft: value } : { marginRight: value },
    // Padding utilities
    paddingStart: (value: string) => isRTL ? { paddingRight: value } : { paddingLeft: value },
    paddingEnd: (value: string) => isRTL ? { paddingLeft: value } : { paddingRight: value },
    // Text alignment
    textStart: isRTL ? 'text-right' : 'text-left',
    textEnd: isRTL ? 'text-left' : 'text-right',
    // Flex direction
    flexRowReverse: isRTL,
    // CSS logical properties
    inlineStart: isRTL ? 'right' : 'left',
    inlineEnd: isRTL ? 'left' : 'right',
  };
};

/**
 * Get current direction without using React context (for use in utilities)
 */
export const getCurrentDirection = (): DirectionConfig => {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  const dir = document.documentElement.getAttribute('dir') as Direction || 'rtl';
  const lang = document.documentElement.getAttribute('lang') as Language || 'ar';
  
  return {
    direction: dir,
    language: lang,
    isRTL: dir === 'rtl'
  };
};