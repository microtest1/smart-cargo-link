import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { LANGUAGES, LanguageCode, TranslationKey, translate } from "./dictionary";

const STORAGE_KEY = "amoliga.language";

function readStored(): LanguageCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && LANGUAGES.some((l) => l.code === v)) return v as LanguageCode;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

interface Ctx {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => translate("en", k) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(readStored);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  }, [lang]);

  const setLang = useCallback((l: LanguageCode) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
