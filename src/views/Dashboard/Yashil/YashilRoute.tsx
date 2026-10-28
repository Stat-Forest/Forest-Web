import type { ReactNode } from "react";
import { useYashilAccess } from "@/features/yashil/permissions";
import { useYashilT } from "@/features/yashil/i18n";
import "./yashil.css";

/**
 * Modul sahifalarini faqat a'zolik yoki modul admini bor foydalanuvchiga ochadi.
 * Server baribir 403 qaytaradi — bu faqat tushunarli xabar uchun.
 */
function YashilRoute({ children }: { children: ReactNode }) {
  const { isLoading, hasAccess, me } = useYashilAccess();
  const { t } = useYashilT();

  if (isLoading || (!me && !hasAccess)) {
    return (
      <div className="yashil-root p-6 flex items-center justify-center min-h-[40vh] ym-muted" aria-busy="true">
        {t("loading")}
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="yashil-root p-4 sm:p-6">
        <div className="ym-card max-w-2xl mx-auto text-center space-y-3">
          <h1 className="ym-title">{t("not_member_title")}</h1>
          <p className="ym-muted leading-relaxed">{t("not_member_text")}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default YashilRoute;
