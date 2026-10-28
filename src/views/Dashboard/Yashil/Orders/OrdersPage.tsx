import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import YashilLayout from "../YashilLayout";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { useGetYashilOrdersQuery } from "@/services/yashilApi";
import type { MemberType } from "@/features/yashil/types";
import { DeadlineText, StateBadge, fmtDate } from "./orderUi";

interface Tab {
  key: YashilKey;
  states: string;
}

/** Kabinet turiga qarab tab'lar (TZ §14): holat filtri backend'ga `state=a,b` bo'lib ketadi. */
const TABS: Record<MemberType | "admin", Tab[]> = {
  mahalla: [
    { key: "tab_all", states: "" },
    { key: "tab_draft", states: "draft" },
    { key: "tab_sent", states: "union_new,union_review,supplier_new,supplier_review" },
    { key: "tab_returned", states: "returned" },
    { key: "tab_execution", states: "execution" },
  ],
  union: [
    { key: "tab_new", states: "union_new" },
    { key: "tab_review", states: "union_review" },
    { key: "tab_sent", states: "supplier_new,supplier_review,execution" },
    { key: "tab_returned", states: "returned" },
    { key: "tab_all", states: "" },
  ],
  supplier: [
    { key: "tab_new", states: "supplier_new" },
    { key: "tab_review", states: "supplier_review" },
    { key: "tab_execution", states: "execution" },
    { key: "tab_returned", states: "returned" },
    { key: "tab_all", states: "" },
  ],
  observer: [
    { key: "tab_all", states: "" },
    { key: "tab_review", states: "union_new,union_review,supplier_new,supplier_review" },
    { key: "tab_execution", states: "execution" },
    { key: "tab_returned", states: "returned" },
  ],
  admin: [{ key: "tab_all", states: "" }, { key: "tab_execution", states: "execution" }],
};

function OrdersPage() {
  const { t } = useYashilT();
  const { cabinet, canPrepare } = useYashilAccess();
  const navigate = useNavigate();
  const tabs = TABS[cabinet?.member_type ?? "admin"];
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ state: tabs[tab]?.states || undefined, q: q || undefined, page, per_page: 20 }), [tabs, tab, q, page]);
  const { data, isFetching } = useGetYashilOrdersQuery(params);
  const canCreate = cabinet?.member_type === "mahalla" && canPrepare;
  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <YashilLayout
      title={t("orders_title")}
      actions={canCreate ? <Link to={YASHIL_ROUTES.orderNew} className="ym-btn ym-btn--primary">{t("new_order")}</Link> : undefined}
    >
      <div className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map((tb, i) => (
              <button key={tb.key} type="button" role="tab" aria-selected={i === tab} className={`ym-btn ${i === tab ? "ym-btn--active" : ""}`} onClick={() => { setTab(i); setPage(1); }}>
                {t(tb.key)}
              </button>
            ))}
          </div>
          <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
        </div>

        {data && data.results.length === 0 && !isFetching ? (
          <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p>
        ) : (
          <div className="overflow-auto">
            <table className="ym-table">
              <thead>
                <tr>
                  <th>{t("col_number")}</th>
                  <th>{t("col_title")}</th>
                  <th>{t("col_mahalla")}</th>
                  <th>{t("col_supplier")}</th>
                  <th>{t("col_state")}</th>
                  <th>{t("col_deadline")}</th>
                  <th>{t("col_date")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.results ?? []).map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => navigate(YASHIL_ROUTES.order(o.id))}>
                    <td className="font-semibold whitespace-nowrap">{o.display_number}<div className="ym-muted text-[11px] font-normal">v{o.version_no}</div></td>
                    <td>{o.title || "—"}</td>
                    <td>{o.mahalla_name}</td>
                    <td>{o.supplier_name}</td>
                    <td><StateBadge state={o.state} /></td>
                    <td><DeadlineText info={o.deadline} state={o.state} /></td>
                    <td className="ym-muted whitespace-nowrap">{fmtDate(o.last_submitted_at || o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span className="ym-muted">{page} / {pages}</span>
            <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>
    </YashilLayout>
  );
}

export default OrdersPage;
