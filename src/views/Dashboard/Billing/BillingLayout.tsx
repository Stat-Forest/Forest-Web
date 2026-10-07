import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { ArrowLeft } from "lucide-react";
import type { RootState } from "@/app/store";
import { useGetStatementsReportQuery } from "@/services/reportsApi";
import { findKadastrParent } from "@/services/sidebarMenu";
import { useBillingAccess } from "@/features/billing/permissions";
import { BILLING_SIDEBAR_GROUP_ID } from "@/features/billing/constants";

interface BillingLayoutProps {
  /** Breadcrumb'ning oxirgi bo'g'ini (sahifa nomi). */
  title: string;
  /** Oraliq bo'g'in: standart "Ijara billing"; detail sahifalarda masalan "Shartnomalar monitoring". */
  section?: string;
  /** Sarlavha kartasining o'ng tomonidagi tugmalar. */
  actions?: ReactNode;
  /** Ortga tugmasi: berilsa sidebar submenu o'rniga shu marshrutga qaytadi. */
  backTo?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Ijara billing sahifalari uchun umumiy sarlavha kartasi:
 * Ortga / "O'rmon kadastri va monitoringi / Ijara billing / <sahifa>".
 * Ortga tugmasi sidebar'dagi tegishli submenu'ni (sheet) ochadi —
 * billing_user uchun "ijara-billing", boshqalar uchun kadastr parent id.
 */
function BillingLayout({ title, section, actions, backTo, children, className = "" }: BillingLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lang = useSelector((state: RootState) => state.language.lang);
  const { isBillingUser } = useBillingAccess();

  const { data: statementData } = useGetStatementsReportQuery(
    isBillingUser ? skipToken : { lang },
  );

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    const parentId = isBillingUser
      ? BILLING_SIDEBAR_GROUP_ID
      : findKadastrParent(statementData as Array<{ id?: string; name?: string }> | undefined)?.id ||
        BILLING_SIDEBAR_GROUP_ID;
    window.dispatchEvent(
      new CustomEvent("open-sidebar-submenu", { detail: { parentId } }),
    );
  };

  const crumbs = [t("billing.kadastr_root"), section ?? t("ijara_billing")];

  return (
    <div className={`px-3 py-2 space-y-4 ${className}`}>
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-semibold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <ArrowLeft size={16} className="text-white transition-transform group-hover:-translate-x-0.5" />
            <span>{t("back") || "Orqaga qaytish"}</span>
          </button>

          <div className="flex items-baseline gap-2 flex-wrap leading-none min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={i} className="contents">
                <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 leading-none">
                  {crumb}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 leading-none select-none">
                  /
                </span>
              </span>
            ))}
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
              {title}
            </span>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {children}
    </div>
  );
}

export default BillingLayout;
