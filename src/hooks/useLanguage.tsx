import { createContext, useContext, useState, useCallback } from "react";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { translations, type Language, type TranslationKey } from "@/lib/i18n";

const LANG_KEY = "otechy_language";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

function getInitialLanguage(): Language {
  const saved = safeGetItem(LANG_KEY);
  return saved === "ny" ? "ny" : "en";
}

/**
 * Call this once at the top of the app (in App.tsx) and pass the result
 * into <LanguageContext.Provider value={...}>, same pattern as useAuthState.
 * Any component anywhere in the tree then reads it via useLanguage().
 */
export function useLanguageState(): LanguageContextType {
  // Initialize synchronously (like useTheme) so the first paint is already
  // in the saved language — no flash of the wrong language on launch.
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    safeSetItem(LANG_KEY, lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  return { language, setLanguage, t };
}

export function useLanguage() {
  return useContext(LanguageContext);
}
