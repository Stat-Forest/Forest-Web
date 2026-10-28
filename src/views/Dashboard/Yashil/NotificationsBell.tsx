/** Kabinet xabarnomalari (TZ §22.4): qo'ng'iroq + o'qilmaganlar soni, ro'yxat, buyurtmaga o'tish. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useYashilT } from "@/features/yashil/i18n";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { useGetYashilNotificationsQuery, useReadAllYashilNotificationsMutation, useReadYashilNotificationMutation } from "@/services/yashilApi";
import { fmtDateTime } from "./Orders/orderUi";

function NotificationsBell({ unread }: { unread: number }) {
  const { t } = useYashilT();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data } = useGetYashilNotificationsQuery(open ? { per_page: 20 } : undefined, { skip: !open });
  const [read] = useReadYashilNotificationMutation();
  const [readAll] = useReadAllYashilNotificationsMutation();

  return (
    <div className="relative">
      <button type="button" className="ym-btn relative" onClick={() => setOpen((v) => !v)} aria-label={t("notifications")} aria-expanded={open}>
        <Bell size={16} />
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[var(--ym-red)] text-white text-[11px] flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] ym-card !p-3 z-50 shadow-xl max-h-[70vh] overflow-auto" role="dialog" aria-label={t("notifications")}>
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm">{t("notifications")}</b>
            <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => readAll()}>{t("mark_all_read")}</button>
          </div>
          {!data || data.results.length === 0 ? (
            <p className="ym-muted text-sm">{t("no_notifications")}</p>
          ) : (
            <ul className="space-y-1">
              {data.results.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full text-left rounded-lg p-2 text-sm border ${n.read_at ? "border-transparent" : "border-[var(--ym-green-line)] bg-[var(--ym-green-soft)]"}`}
                    onClick={() => {
                      if (!n.read_at) read(n.id);
                      setOpen(false);
                      if (n.order) navigate(YASHIL_ROUTES.order(n.order));
                    }}
                  >
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="ym-muted text-xs">{n.body}</div>}
                    <div className="ym-muted text-[11px]">{fmtDateTime(n.created_at)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;
