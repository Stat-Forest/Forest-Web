/** Mahallalar ma'lumotnomasi (javob A1): ro'yxat, qo'shish/tahrir, faollik, Excel import. */
import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useYashilT } from "@/features/yashil/i18n";
import type { AdminMahalla } from "@/features/yashil/types";
import { useGetYashilAdminMahallasQuery, useGetYashilDistrictsQuery, useGetYashilRegionsQuery, useSaveYashilAdminMahallaMutation } from "@/services/yashilApi";
import { ActiveBadge, FormDialog, Pager, inputCls, periodText, useSave } from "./adminUi";
import { ImportDialog } from "./ImportDialog";

const PER_PAGE = 25;

function MahallaDialog({ edit, onClose }: { edit: AdminMahalla | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminMahallaMutation();
  const { error, field, run } = useSave();
  const { data: regions } = useGetYashilRegionsQuery();
  const [region, setRegion] = useState(edit?.region.id ?? "");
  const { data: districts } = useGetYashilDistrictsQuery(region ? { region } : skipToken);
  const [form, setForm] = useState({
    source_code: edit?.source_code ?? "", name: edit?.name ?? "", district: edit?.district.id ?? "", address: edit?.address ?? "",
    is_active: edit?.is_active ?? true, valid_to: edit?.valid_to ?? "",
  });
  const submit = () => run(() => save({ id: edit?.id, body: { ...form, valid_to: form.valid_to || null } }).unwrap(), onClose);
  return (
    <FormDialog title={edit ? `${t("edit")}: ${edit.name}` : `${t("admin_tab_mahallas")} — ${t("add_new")}`} open onClose={onClose} onSave={submit}
      saving={isLoading} disabled={!form.name || !form.district} error={error}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("filter_region")} *
          <select className="ym-select w-full mt-1" value={region} onChange={(e) => { setRegion(e.target.value); setForm({ ...form, district: "" }); }}>
            <option value="">—</option>
            {(regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("filter_district")} *
          <select className={inputCls(field === "district")} value={form.district} disabled={!region} onChange={(e) => setForm({ ...form, district: e.target.value })}>
            <option value="">—</option>
            {(districts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">{t("col_name")} *<input className={inputCls(field === "name")} value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm block">{t("col_code")}<input className={inputCls(field === "source_code")} value={form.source_code} maxLength={50} onChange={(e) => setForm({ ...form, source_code: e.target.value })} /></label>
      </div>
      <label className="text-sm block">{t("col_address")}<input className={inputCls(field === "address")} value={form.address} maxLength={500} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
      <div className="grid sm:grid-cols-2 gap-3 items-end">
        <label className="text-sm block">{t("valid_to")}<input type="date" className={inputCls(field === "valid_to")} value={form.valid_to ?? ""} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} /></label>
        <label className="inline-flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />{t("status_active")}</label>
      </div>
    </FormDialog>
  );
}

export function MahallasTab() {
  const { t } = useYashilT();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ edit: AdminMahalla | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const params = useMemo(() => ({ q: q || undefined, page, per_page: PER_PAGE }), [q, page]);
  const { data, isFetching } = useGetYashilAdminMahallasQuery(params);
  return (
    <div className="ym-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ym-btn" onClick={() => setImporting(true)}>{t("import_excel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("add_new")}</button>
        </div>
      </div>
      {data && data.results.length === 0 && !isFetching ? <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p> : (
        <div className="overflow-auto">
          <table className="ym-table text-[13px]">
            <thead><tr><th>{t("col_code")}</th><th>{t("col_name")}</th><th>{t("col_region")}</th><th>{t("col_period")}</th><th>{t("col_status")}</th><th></th></tr></thead>
            <tbody>
              {(data?.results ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{m.source_code || "—"}</td>
                  <td>{m.name}{m.address && <div className="ym-muted text-[11px]">{m.address}</div>}</td>
                  <td>{m.region.name}<div className="ym-muted text-[11px]">{m.district.name}</div></td>
                  <td className="whitespace-nowrap">{periodText(m.valid_from, m.valid_to)}</td>
                  <td><ActiveBadge active={m.is_active} /></td>
                  <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: m })}>{t("edit")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} count={data?.count ?? 0} perPage={PER_PAGE} onPage={setPage} />
      {dialog && <MahallaDialog edit={dialog.edit} onClose={() => setDialog(null)} />}
      {importing && <ImportDialog kind="mahallas" title={`${t("admin_tab_mahallas")} — ${t("import_excel")}`} onClose={() => setImporting(false)} />}
    </div>
  );
}
