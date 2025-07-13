import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-gray-600 hover:text-[#1C7BB1] transition-colors"
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">
        {language === 'es' ? 'ES' : 'EN'}
      </span>
    </Button>
  );
}