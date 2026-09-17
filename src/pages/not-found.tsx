import { Link } from "wouter";
import { GraduationCap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-600 flex items-center justify-center shadow-lg">
        <GraduationCap className="w-8 h-8 text-white" />
      </div>
      <div>
        <h1 className="text-4xl font-black text-foreground">404</h1>
        <p className="text-muted-foreground mt-1">{t("page_not_found")}</p>
      </div>
      <Link
        href="/"
        className="bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
      >
        {t("back_to_hub")}
      </Link>
    </div>
  );
}
