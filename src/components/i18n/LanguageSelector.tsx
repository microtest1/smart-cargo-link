import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, LanguageCode } from "@/i18n/dictionary";
import { useLanguage } from "@/i18n/LanguageProvider";

export function LanguageSelector() {
  const { lang, setLang, t } = useLanguage();
  return (
    <Select value={lang} onValueChange={(v) => setLang(v as LanguageCode)}>
      <SelectTrigger className="h-9 w-auto gap-1 px-2 text-sm" aria-label={t("nav.language")}>
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
