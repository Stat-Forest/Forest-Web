/** DM xizmat quvvatini kiritish (javob В5): admin (istalgan DM) yoki DM'ning imzolovchi a'zosi (o'z tashkiloti). */
import { useEffect, useState } from "react";
import { useYashilT, pickName, type YashilKey } from "@/features/yashil/i18n";
import type { CapacityRow, UUID } from "@/features/yashil/types";
import { useSaveYashilCapacityMutation } from "@/services/yashilApi";
import { FormDialog, useSave } from "./adminUi";

export function CapacityEditor({ admin, organization, period, rows, onClose }: {
  admin: boolean; organization?: UUID; period: string; rows: CapacityRow[]; onClose: () => void;
}) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilCapacityMutation();
  const { error, run } = useSave();
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { setValues(Object.fromEntries(rows.map((r) => [r.catalog_item_id, r.capacity]))); }, [rows]);
  const submit = () => run(() => save({
    admin, organization, period, rows: rows.map((r) => ({ catalog_item: r.catalog_item_id, capacity: values[r.catalog_item_id] ?? "0" })),
  }).unwrap(), onClose);
  return (
    <FormDialog title={`${t("capacity_edit")} · ${period}`} open onClose={onClose} onSave={submit} saving={isLoading} error={error}>
      {rows.length === 0 ? <p className="ym-muted text-sm">{t("empty")}</p> : (
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_name")}</th><th>{t("col_used")}</th><th>{t("col_capacity")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.catalog_item_id}>
                <td>{pickName(r)} <span className="ym-muted">({t(`unit_${r.unit}` as YashilKey)})</span></td>
                <td>{r.used}</td>
                <td><input type="number" min={Number(r.used) || 0} step="any" inputMode="decimal" className="ym-select w-28" value={values[r.catalog_item_id] ?? ""}
                  onChange={(e) => setValues({ ...values, [r.catalog_item_id]: e.target.value })} aria-label={`${r.code} ${t("col_capacity")}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </FormDialog>
  );
}
