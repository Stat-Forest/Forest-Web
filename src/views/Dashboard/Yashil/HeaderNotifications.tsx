/**
 * «Яшил маҳалла» kabinet xabarnomalari (TZ §22.4) platformaning umumiy bildirishnoma panelida (D-28).
 * Sarlavha `kind` bo'yicha joriy tilda tuziladi; izoh (body) — foydalanuvchi yozgan matn.
 */
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import type { YashilNotificationOut } from "@/features/yashil/types";
import {
  useGetYashilNotificationsQuery,
  useReadAllYashilNotificationsMutation,
  useReadYashilNotificationMutation,
} from "@/services/yashilApi";
import { fmtDateTime } from "./Orders/orderUi";

/** O'qilmagan modul xabarnomalari soni (platforma qo'ng'irog'idagi raqamga qo'shiladi). */
export function useYashilUnread(): number {
  const { hasAccess, me } = useYashilAccess();
  return hasAccess ? me?.unread_notifications ?? 0 : 0;
}

/** Panel ochilganda modul xabarnomalari (RTK keshi — panel va sarlavha bitta so'rovni bo'lishadi). */
export function useYashilNotifications(open: boolean) {
  const { hasAccess } = useYashilAccess();
  const { data } = useGetYashilNotificationsQuery({ per_page: 20 }, { skip: !open || !hasAccess });
  return hasAccess ? data?.results ?? [] : [];
}

export function YashilHeaderNotifications({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useYashilT();
  const navigate = useNavigate();
  const items = useYashilNotifications(open);
  const [read] = useReadYashilNotificationMutation();
  const [readAll] = useReadAllYashilNotificationsMutation();
  if (!items.length) return null;

  const title = (n: YashilNotificationOut) => {
    const key = `notif_${n.kind}` as YashilKey;
    const label = t(key);
    if (label === key) return n.title;
    return n.order_number ? `${label}: ${n.order_number}` : label;
  };
  const unread = items.some((n) => !n.read_at);

  return (
    <section className="space-y-3 mb-4" aria-label={t("notif_section")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t("notif_section")}</span>
        {unread && (
          <button type="button" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline" onClick={() => readAll()}>
            {t("mark_all_read")}
          </button>
        )}
      </div>
      {items.map((n) => (
        <Card
          key={n.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!n.read_at) read(n.id);
            if (n.order) {
              onNavigate();
              navigate(YASHIL_ROUTES.order(n.order));
            }
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLElement).click(); }}
          className={`cursor-pointer border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-200 rounded-2xl p-4 shadow-xs ${n.read_at ? "" : "ring-1 ring-emerald-500/40"}`}
        >
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Leaf size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm text-slate-800 dark:text-slate-200 leading-relaxed ${n.read_at ? "" : "font-semibold"}`}>{title(n)}</p>
              {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line line-clamp-3">{n.body}</p>}
              <p className="text-[11px] text-slate-400 mt-1">{fmtDateTime(n.created_at)}</p>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
