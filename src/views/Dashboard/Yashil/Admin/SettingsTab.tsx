/** Versiyali qoidalar (TZ §24.1): joriy qiymat, kutilayotgan versiya, tarix; yangi versiya — kuchga kirish sanasi va asos bilan. */
import { useState } from "react";
import { useYashilT } from "@/features/yashil/i18n";
import type { RuleRow } from "@/features/yashil/types";
import { useGetYashilAdminSettingsQuery, useSaveYashilAdminSettingMutation } from "@/services/yashilApi";
import { fmtDate, fmtDateTime, todayIso } from "../Orders/orderUi";
import { FormDialog, inputCls, useSave } from "./adminUi";

function RuleDialog({ rule, onClose }: { rule: RuleRow; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminSettingMutation();
  const { error, field, run } = useSave();
  const [value, setValue] = useState<string>(String(rule.value));
  const [eff, setEff] = useState(todayIso());
  const [note, setNote] = useState("");
  const submit = () => run(() => save({ key: rule.key, value: rule.type === "bool" ? value === "true" : Number(value), effective_from: eff, note }).unwrap(), onClose);
  return (
    <FormDialog title={`${t("rule_new_version")}: ${rule.label}`} description={t("rules_note")} open onClose={onClose} onSave={submit} saving={isLoading} error={error}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("col_value")} *
          {rule.type === "bool" ? (
            <select className={inputCls(field === "value")} value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="true">{t("yes")}</option>
              <option value="false">{t("no")}</option>
            </select>
          ) : (
            <input type="number" min={rule.min ?? undefined} max={rule.max ?? undefined} className={inputCls(field === "value")} value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </label>
        <label className="text-sm block">{t("col_effective")} *<input type="date" min={todayIso()} className={inputCls(field === "effective_from")} value={eff} onChange={(e) => setEff(e.target.value)} /></label>
      </div>
      <label className="text-sm block">{t("import_source")}<input className={inputCls(field === "note")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
    </FormDialog>
  );
}

const show = (v: number | boolean, t: (k: "yes" | "no") => string) => (typeof v === "boolean" ? t(v ? "yes" : "no") : String(v));

export function SettingsTab() {
  const { t } = useYashilT();
  const { data } = useGetYashilAdminSettingsQuery();
  const [edit, setEdit] = useState<RuleRow | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="ym-card space-y-3">
      <p className="text-xs ym-muted">{t("rules_note")}</p>
      <div className="overflow-auto">
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_name")}</th><th>{t("col_value")}</th><th>{t("rule_pending")}</th><th></th></tr></thead>
          <tbody>
            {(data?.results ?? []).map((r) => (
              <tr key={r.key} className="align-top">
                <td>{r.label}<div className="ym-muted text-[11px] font-mono">{r.key}</div>
                  {r.history.length > 0 && (
                    <button type="button" className="text-[11px] underline ym-muted mt-1" onClick={() => setOpen(open === r.key ? null : r.key)}>{t("rule_history")} ({r.history.length})</button>
                  )}
                  {open === r.key && (
                    <ul className="text-[11px] mt-1 space-y-0.5">
                      {r.history.map((h) => <li key={h.version}>v{h.version}: <b>{show(h.value, t)}</b> · {fmtDate(h.effective_from)} · {h.changed_by || "—"} · {fmtDateTime(h.created_at)}{h.note ? ` · ${h.note}` : ""}</li>)}
                    </ul>
                  )}
                </td>
                <td className="font-semibold">{show(r.value, t)}{r.value === r.default && r.history.length === 0 && <span className="ym-muted font-normal text-[11px] ml-1">({t("rule_default")})</span>}</td>
                <td>{r.pending.length ? r.pending.map((p) => <div key={p.version} className="ym-badge ym-badge--amber">{show(p.value, t)} · {fmtDate(p.effective_from)}</div>) : "—"}</td>
                <td><button type="button" className="ym-btn" onClick={() => setEdit(r)}>{t("rule_new_version")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <RuleDialog rule={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
