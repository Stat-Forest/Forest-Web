/** Ombor (TZ §9): pozitsiyalar (yetishmovchilik), kirim/boshlang'ich qoldiq/qaytarish, harakatlar, teskari operatsiya, DM quvvati. */
import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import YashilLayout from "../YashilLayout";
import { pickName, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import type { StockEntryIn, StockMovementOut, StockRow } from "@/features/yashil/types";
import {
  newIdempotencyKey,
  useDecideYashilReversalMutation,
  useGetYashilCapacityQuery,
  useGetYashilStockMovementsQuery,
  useGetYashilStockOrganizationsQuery,
  useGetYashilStockQuery,
  usePostYashilStockEntryMutation,
  useRequestYashilReversalMutation,
} from "@/services/yashilApi";
import { apiErrorField, apiErrorText, fmtDate, fmtDateTime, todayIso } from "../Orders/orderUi";
import { ImportDialog } from "../Admin/ImportDialog";
import { CapacityEditor } from "../Admin/CapacityEditor";

type EntryKind = "receipts" | "opening" | "returns";
const ENTRY_TITLE: Record<EntryKind, YashilKey> = { receipts: "receipt_title", opening: "opening_title", returns: "return_in_title" };
const REVERSIBLE = new Set(["opening", "receipt", "return_in"]);

const thisMonth = (): string => todayIso().slice(0, 7);

function EntryDialog({ kind, rows, onClose, preset }: { kind: EntryKind; rows: StockRow[]; onClose: () => void; preset?: string }) {
  const { t, script } = useYashilT();
  const [item, setItem] = useState(preset ?? rows[0]?.catalog_item_id ?? "");
  const [qty, setQty] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [key] = useState(() => newIdempotencyKey());
  const [post, { isLoading }] = usePostYashilStockEntryMutation();
  const chosen = rows.find((r) => r.catalog_item_id === item);

  const submit = async () => {
    setError(null);
    setErrorField(null);
    const body: StockEntryIn = { catalog_item: item, qty, doc_number: docNumber, doc_date: docDate, note, file };
    try {
      const res = await post({ kind, body, key }).unwrap();
      toast.success(`${t("saved")} · ${t("balance_after")}: ${res.balance}`);
      res.warnings.forEach((w) => toast.warn(w.code === "doc_number_duplicate" ? t("warn_doc_duplicate") : w.message));
      onClose();
    } catch (e) {
      setError(apiErrorText(e, t("error_generic")));
      setErrorField(apiErrorField(e));
    }
  };

  const cls = (f: string) => `ym-select w-full mt-1 ${errorField === f ? "border-[var(--ym-red)]" : ""}`;
  return (
    <Dialog open onOpenChange={(v) => !v && !isLoading && onClose()}>
      <DialogContent className="yashil-root">
        <DialogHeader><DialogTitle>{t(ENTRY_TITLE[kind])}</DialogTitle><DialogDescription>{kind === "opening" ? t("opening_hint") : t("warehouse_subtitle")}</DialogDescription></DialogHeader>
        <label className="text-sm block">{t("col_name")} *
          <select className={cls("catalog_item")} value={item} onChange={(e) => setItem(e.target.value)}>
            {rows.map((r) => <option key={r.catalog_item_id} value={r.catalog_item_id}>{r.code} — {pickName(r, script)} ({t(`unit_${r.unit}` as YashilKey)})</option>)}
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm block">{t("col_qty")} * {chosen && <span className="ym-muted">({t(`unit_${chosen.unit}` as YashilKey)})</span>}
            <input type="number" inputMode="decimal" min={0} step={chosen && chosen.precision > 0 ? 1 / 10 ** chosen.precision : 1} className={cls("qty")} value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label className="text-sm block">{t("doc_date")} *<input type="date" className={cls("doc_date")} value={docDate} max={todayIso()} onChange={(e) => setDocDate(e.target.value)} /></label>
          <label className="text-sm block">{t("doc_number")} {kind === "returns" ? "*" : ""}<input className={cls("doc_number")} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} maxLength={100} /></label>
          <label className="text-sm block">{t("add_file")}<input type="file" accept=".jpg,.jpeg,.png,.pdf" className="ym-select w-full mt-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        <label className="text-sm block">{t("note")}<textarea className="ym-select w-full mt-1 min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></label>
        {error && <p className="text-sm text-[var(--ym-red)] bg-[var(--ym-red-bg)] rounded-lg p-3">{error}</p>}
        <DialogFooter>
          <button type="button" className="ym-btn" onClick={onClose} disabled={isLoading}>{t("cancel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={submit} disabled={isLoading || !item || !qty || !docDate}>{t("save")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarehousePage() {
  const { t, script } = useYashilT();
  const { cabinet, me } = useYashilAccess();
  const isSupplier = cabinet?.member_type === "supplier";
  const needsOrg = !isSupplier;
  const { data: orgs } = useGetYashilStockOrganizationsQuery(needsOrg ? undefined : skipToken);
  const [orgId, setOrgId] = useState("");
  const effectiveOrg = needsOrg ? orgId || orgs?.results[0]?.id || "" : undefined;
  const stockParams = needsOrg ? (effectiveOrg ? { organization: effectiveOrg } : skipToken) : undefined;
  const { data: stock, isLoading, error } = useGetYashilStockQuery(stockParams as never);
  const [itemFilter, setItemFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const movParams = useMemo(() => ({ organization: effectiveOrg, item: itemFilter ?? undefined, status: statusFilter || undefined, page, per_page: 20 }), [effectiveOrg, itemFilter, statusFilter, page]);
  const { data: movements } = useGetYashilStockMovementsQuery(needsOrg && !effectiveOrg ? skipToken : movParams);
  const isDm = stock?.organization.supplier_type === "dm";
  const [period, setPeriod] = useState(thisMonth());
  const { data: capacity } = useGetYashilCapacityQuery(isDm ? { period, organization: effectiveOrg } : skipToken);
  const [entry, setEntry] = useState<{ kind: EntryKind; preset?: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [capEdit, setCapEdit] = useState(false);
  const [reversal, setReversal] = useState<StockMovementOut | null>(null);
  const [decision, setDecision] = useState<{ mv: StockMovementOut; kind: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [requestReversal, { isLoading: requesting }] = useRequestYashilReversalMutation();
  const [decide, { isLoading: deciding }] = useDecideYashilReversalMutation();

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(t("action_ok"));
      setReversal(null);
      setDecision(null);
      setNote("");
    } catch (e) {
      toast.error(apiErrorText(e, t("error_generic")));
    }
  };

  const canPost = !!stock?.can_post;
  const canApprove = !!stock?.can_approve;
  const pages = movements ? Math.max(1, Math.ceil(movements.count / 20)) : 1;

  return (
    <YashilLayout
      title={t("warehouse_title")}
      actions={canPost && stock ? (
        <>
          <button type="button" className="ym-btn" onClick={() => setEntry({ kind: "opening" })}>{t("add_opening")}</button>
          <button type="button" className="ym-btn" onClick={() => setImporting(true)}>{t("opening_import")}</button>
          <button type="button" className="ym-btn" onClick={() => setEntry({ kind: "returns" })}>{t("add_return")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={() => setEntry({ kind: "receipts" })}>{t("add_receipt")}</button>
        </>
      ) : undefined}
    >
      {needsOrg && (
        <div className="ym-card flex flex-wrap items-center gap-3">
          <label className="text-sm flex items-center gap-2">{t("choose_organization")}
            <select className="ym-select" value={effectiveOrg ?? ""} onChange={(e) => { setOrgId(e.target.value); setItemFilter(null); setPage(1); }}>
              {(orgs?.results ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}{o.shortage_count ? ` — ${o.shortage_count} ${t("shortage_count")}` : ""}</option>)}
            </select>
          </label>
          {me?.is_admin && <span className="ym-badge ym-badge--blue">{t("admin_badge")}</span>}
        </div>
      )}

      {isLoading && <div className="ym-card ym-muted">{t("loading")}</div>}
      {error && <div className="ym-card">{apiErrorText(error, t("error_generic"))}</div>}

      {stock && (
        <>
          <section className="ym-card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{stock.organization.name} — {stock.warehouse.name}</h2>
                <p className="ym-muted text-xs">{t(isDm ? "warehouse_subtitle_dm" : "warehouse_subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stock.shortage_count > 0 && <span className="ym-badge ym-badge--red">{stock.shortage_count} {t("shortage_count")}</span>}
                {stock.pending_reversals > 0 && <span className="ym-badge ym-badge--amber">{t("pending_reversals")}: {stock.pending_reversals}</span>}
              </div>
            </div>
            <div className="overflow-auto">
              <table className="ym-table">
                <thead><tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_unit")}</th><th>{t("col_opening")}</th><th>{t("col_received")}</th><th>{t("col_allocated")}</th><th>{t("col_released")}</th><th>{t("col_balance")}</th><th>{t("col_shortage")}</th></tr></thead>
                <tbody>
                  {stock.rows.map((r) => {
                    const neg = Number(r.balance) < 0;
                    return (
                      <tr key={r.catalog_item_id} className={`cursor-pointer ${itemFilter === r.catalog_item_id ? "bg-[var(--ym-green-soft)]" : ""}`} onClick={() => { setItemFilter(itemFilter === r.catalog_item_id ? null : r.catalog_item_id); setPage(1); }}>
                        <td className="font-mono text-xs">{r.code}</td>
                        <td>{pickName(r, script)}</td>
                        <td>{t(`unit_${r.unit}` as YashilKey)}</td>
                        <td>{r.opening}</td>
                        <td>{r.received}</td>
                        <td>{r.allocated}</td>
                        <td>{r.released}{Number(r.returned) ? ` (+${r.returned})` : ""}</td>
                        <td className={`font-semibold ${neg ? "text-[var(--ym-red)]" : ""}`}>{r.balance}</td>
                        <td>{neg ? <span className="ym-badge ym-badge--red">{t("shortage_badge")}: {r.shortage}</span> : <span className="ym-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {isDm && (
            <section className="ym-card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-lg">{t("capacity_title")}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm flex items-center gap-2">{t("period")}<input type="month" className="ym-select" value={period} onChange={(e) => setPeriod(e.target.value || thisMonth())} /></label>
                  {isSupplier && canApprove && capacity && <button type="button" className="ym-btn ym-btn--primary" onClick={() => setCapEdit(true)}>{t("capacity_edit")}</button>}
                </div>
              </div>
              <table className="ym-table">
                <thead><tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_unit")}</th><th>{t("col_capacity")}</th><th>{t("col_used")}</th><th>{t("col_available")}</th></tr></thead>
                <tbody>
                  {(capacity?.rows ?? []).map((r) => (
                    <tr key={r.catalog_item_id}><td className="font-mono text-xs">{r.code}</td><td>{pickName(r, script)}</td><td>{t(`unit_${r.unit}` as YashilKey)}</td><td>{r.capacity}</td><td>{r.used}</td><td className={`font-semibold ${Number(r.available) <= 0 ? "text-[var(--ym-red)]" : ""}`}>{r.available}</td></tr>
                  ))}
                  {capacity && capacity.rows.length === 0 && <tr><td colSpan={6} className="ym-muted text-center">{t("empty")}</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          <section className="ym-card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-lg">{t("movements_title")}{itemFilter && <span className="ym-badge ml-2">{stock.rows.find((r) => r.catalog_item_id === itemFilter)?.code} ×</span>}</h3>
              <select className="ym-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label={t("col_status")}>
                <option value="">{t("tab_all")}</option>
                <option value="posted">{t("mstatus_posted")}</option>
                <option value="pending_approval">{t("mstatus_pending_approval")}</option>
                <option value="rejected">{t("mstatus_rejected")}</option>
              </select>
            </div>
            <div className="overflow-auto">
              <table className="ym-table">
                <thead><tr><th>{t("col_date")}</th><th>{t("col_kind")}</th><th>{t("col_name")}</th><th>{t("col_qty")}</th><th>{t("doc_number")}</th><th>{t("note")}</th><th>{t("col_who")}</th><th>{t("col_status")}</th><th></th></tr></thead>
                <tbody>
                  {(movements?.results ?? []).map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap ym-muted text-xs">{fmtDateTime(m.created_at)}</td>
                      <td>{t(`kind_${m.kind}` as YashilKey)}{m.order_number ? <div className="ym-muted text-[11px]">{m.order_number}</div> : null}</td>
                      <td>{m.catalog_item.code} — {pickName(m.catalog_item, script)}</td>
                      <td className={`font-semibold ${Number(m.qty) < 0 ? "text-[var(--ym-red)]" : ""}`}>{Number(m.qty) > 0 ? `+${m.qty}` : m.qty}</td>
                      <td className="whitespace-nowrap">{m.doc_number || "—"}{m.doc_date ? <div className="ym-muted text-[11px]">{fmtDate(m.doc_date)}</div> : null}{m.file_url && <a href={m.file_url} target="_blank" rel="noreferrer" className="block text-[11px] underline text-[var(--ym-green-dark)]">{t("add_file").replace("+", "").trim()}</a>}</td>
                      <td className="text-xs max-w-[220px]">{m.note}{m.decision_note ? <div className="ym-muted">{m.decision_note}</div> : null}</td>
                      <td className="text-xs">{m.requested_by}{m.approved_by_name ? <div className="ym-muted">→ {m.approved_by_name}</div> : null}</td>
                      <td><span className={`ym-badge ${m.status === "pending_approval" ? "ym-badge--amber" : m.status === "rejected" ? "ym-badge--red" : ""}`}>{t(`mstatus_${m.status}` as YashilKey)}</span></td>
                      <td className="whitespace-nowrap">
                        {canPost && m.status === "posted" && REVERSIBLE.has(m.kind) && <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => { setNote(""); setReversal(m); }}>{t("reversal_request")}</button>}
                        {canApprove && m.kind === "reversal" && m.status === "pending_approval" && (
                          <span className="inline-flex gap-1">
                            <button type="button" className="ym-btn ym-btn--primary !min-h-7 !px-2 text-xs" onClick={() => { setNote(""); setDecision({ mv: m, kind: "approve" }); }}>{t("approve")}</button>
                            <button type="button" className="ym-btn !min-h-7 !px-2 text-xs" onClick={() => { setNote(""); setDecision({ mv: m, kind: "reject" }); }}>{t("reject")}</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {movements && movements.results.length === 0 && <tr><td colSpan={9} className="ym-muted text-center py-4">{t("empty")}</td></tr>}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                <span className="ym-muted">{page} / {pages}</span>
                <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
              </div>
            )}
          </section>
        </>
      )}

      {entry && stock && <EntryDialog kind={entry.kind} rows={stock.rows} preset={entry.preset} onClose={() => setEntry(null)} />}

      <Dialog open={!!reversal} onOpenChange={(v) => !v && setReversal(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{t("reversal_title")}</DialogTitle><DialogDescription>{t("reversal_hint")}</DialogDescription></DialogHeader>
          {reversal && <p className="text-sm">{t(`kind_${reversal.kind}` as YashilKey)} · {reversal.catalog_item.code} · {reversal.qty} · {reversal.doc_number || "—"}</p>}
          <label className="text-sm block">{t("reversal_note")}<textarea className="ym-select w-full mt-1 min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setReversal(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={requesting || !note.trim()} onClick={() => reversal && run(() => requestReversal({ movement: reversal.id, note }).unwrap())}>{t("send_request")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decision} onOpenChange={(v) => !v && setDecision(null)}>
        <DialogContent className="yashil-root">
          <DialogHeader><DialogTitle>{decision?.kind === "approve" ? t("approve") : t("reject")}: {t("kind_reversal")}</DialogTitle><DialogDescription>{decision ? `${decision.mv.catalog_item.code} · ${decision.mv.qty} · ${decision.mv.note}` : ""}</DialogDescription></DialogHeader>
          <label className="text-sm block">{decision?.kind === "reject" ? `${t("reject_note")} *` : t("note")}<textarea className="ym-select w-full mt-1 min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <DialogFooter>
            <button type="button" className="ym-btn" onClick={() => setDecision(null)}>{t("cancel")}</button>
            <button type="button" className="ym-btn ym-btn--primary" disabled={deciding || (decision?.kind === "reject" && !note.trim())} onClick={() => decision && run(() => decide({ id: decision.mv.id, decision: decision.kind, note }).unwrap())}>{t("confirm")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {importing && <ImportDialog kind="opening" title={t("opening_import")} onClose={() => setImporting(false)} />}
      {capEdit && capacity && <CapacityEditor admin={false} period={period} rows={capacity.rows} onClose={() => setCapEdit(false)} />}
    </YashilLayout>
  );
}

export default WarehousePage;
