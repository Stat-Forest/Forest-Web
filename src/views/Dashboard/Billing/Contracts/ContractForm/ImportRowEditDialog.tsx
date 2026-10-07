// Excel import: bitta qatorni (ImportRow) tahrirlash dialogi
// (billing ContractUploadModel.vue + ContractExcelUpdateForm.vue porti).
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetActivityTypesQuery, useGetLandTypesQuery, useGetPrivilegeTypesQuery } from "@/services/billingApi";
import { toApiDate, toInputDate } from "@/features/billing/format";
import type {
  ContractWriteErrors,
  ContractWriteTypedArea,
  ImportRow,
  ImportRowContract,
  RefType,
} from "@/features/billing/types";
import { Field, SectionCard, SelectField, TextInput, type Option } from "./fields";
import { flattenMessage, nextKey } from "./formState";

// ---------------------------------------------------------------------------
// Qoralama (barcha qiymatlar satr)
// ---------------------------------------------------------------------------

const CONTRACT_FIELDS = [
  "contract_date",
  "expired_date",
  "auction_date",
  "contract_number",
  "xojalik_inn",
  "xojalik",
  "bolim",
  "region_code",
  "district_code",
  "rent_area",
  "rent_amount",
  "paid_amount",
  "penalty_amount",
  "circle",
  "section",
  "counter",
  "massive",
  "cadastral_number",
  "latitude",
  "longitude",
  "canceled_date",
  "cancel_reason",
] as const;
type ContractField = (typeof CONTRACT_FIELDS)[number];
const DATE_FIELDS = new Set<ContractField>(["contract_date", "expired_date", "auction_date", "canceled_date"]);

const RENTER_FIELDS = ["pinfl", "stir", "full_name", "passport", "phone", "per_adr"] as const;
type RenterField = (typeof RENTER_FIELDS)[number];

type TypedKey = "lands" | "activities" | "privileges";
interface TypedDraft {
  key: string;
  type: string;
  area: string;
}
interface ProductDraft {
  key: string;
  product_export: string;
  product_amount: string;
  export_amount: string;
}
interface Draft {
  contract: Record<ContractField, string>;
  renter: Record<RenterField, string>;
  vacancy: string;
  own_investment: string;
  products: ProductDraft[];
  lands: TypedDraft[];
  activities: TypedDraft[];
  privileges: TypedDraft[];
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

const toDraft = (row: ImportRow): Draft => {
  const c = row.contract as Record<string, unknown>;
  const r = (row.renter ?? {}) as Record<string, unknown>;
  const typed = (items?: ContractWriteTypedArea[]): TypedDraft[] =>
    (items ?? []).map((i) => ({ key: nextKey(), type: str(i.type), area: str(i.area) }));
  return {
    contract: Object.fromEntries(CONTRACT_FIELDS.map((f) => [f, str(c[f])])) as Record<ContractField, string>,
    renter: Object.fromEntries(RENTER_FIELDS.map((f) => [f, str(r[f])])) as Record<RenterField, string>,
    vacancy: str(row.action?.vacancy),
    own_investment: str(row.action?.own_investment),
    products: (row.action_products ?? []).map((p) => ({
      key: nextKey(),
      product_export: str(p.product_export),
      product_amount: str(p.product_amount),
      export_amount: str(p.export_amount),
    })),
    lands: typed(row.lands),
    activities: typed(row.activities),
    privileges: typed(row.privileges),
  };
};

const fromDraft = (draft: Draft, original: ImportRow): ImportRow => {
  const contract: ImportRowContract = {};
  CONTRACT_FIELDS.forEach((f) => {
    const v = draft.contract[f].trim();
    if (v) (contract as Record<string, unknown>)[f] = v;
  });
  const renter: Record<string, unknown> = {};
  RENTER_FIELDS.forEach((f) => {
    const v = draft.renter[f].trim();
    if (!v) return;
    renter[f] = f === "phone" ? `+${v.replace(/\D/g, "")}` : v;
  });
  if (renter.stir && !renter.pinfl) renter.is_legal_entity = true;
  const typed = (rows: TypedDraft[]) =>
    rows.filter((r) => r.type.trim() && r.area.trim()).map((r) => ({ type: r.type.trim(), area: r.area.trim() }));

  const row: ImportRow = { contract, renter };
  const lands = typed(draft.lands);
  const activities = typed(draft.activities);
  const privileges = typed(draft.privileges);
  if (lands.length) row.lands = lands;
  if (activities.length) row.activities = activities;
  if (privileges.length) row.privileges = privileges;
  if (draft.vacancy.trim() || draft.own_investment.trim()) {
    row.action = {
      vacancy: draft.vacancy.trim() || null,
      own_investment: draft.own_investment.trim() || null,
    };
  }
  const products = draft.products
    .filter((p) => p.product_export.trim() || p.product_amount.trim() || p.export_amount.trim())
    .map((p) => ({
      product_export: p.product_export.trim() || null,
      product_amount: p.product_amount.trim() || null,
      export_amount: p.export_amount.trim() || null,
    }));
  if (products.length) row.action_products = products;
  if (original.yearly_amounts?.length) row.yearly_amounts = original.yearly_amounts;
  return row;
};

// ---------------------------------------------------------------------------

interface ImportRowEditDialogProps {
  open: boolean;
  excelRow: number | null;
  row: ImportRow | null;
  errors?: ContractWriteErrors | null;
  onOpenChange: (open: boolean) => void;
  onSave: (row: ImportRow) => void;
}

const CONTRACT_LABELS: Record<ContractField, string> = {
  contract_date: "billing.form_contract_date",
  expired_date: "billing.form_expired_date",
  auction_date: "billing.form_auction_date",
  contract_number: "billing.form_contract_number",
  xojalik_inn: "billing.import_xojalik_inn",
  xojalik: "billing.import_xojalik_name",
  bolim: "billing.import_bolim",
  region_code: "billing.import_region_code",
  district_code: "billing.import_district_code",
  rent_area: "billing.form_rent_area",
  rent_amount: "billing.form_rent_amount",
  paid_amount: "billing.form_paid_amount",
  penalty_amount: "billing.form_penalty_amount",
  circle: "billing.form_circle",
  section: "billing.form_section",
  counter: "billing.form_counter",
  massive: "billing.form_massive",
  cadastral_number: "billing.form_cadastral_number",
  latitude: "billing.form_latitude",
  longitude: "billing.form_longitude",
  canceled_date: "billing.import_canceled_date",
  cancel_reason: "billing.import_cancel_reason",
};

const RENTER_LABELS: Record<RenterField, string> = {
  pinfl: "billing.form_pinfl",
  stir: "billing.form_stir",
  full_name: "billing.form_full_name",
  passport: "billing.form_passport",
  phone: "billing.form_phone",
  per_adr: "billing.form_per_adr",
};

const sectionErr = (errors: ContractWriteErrors | null | undefined, section: string, field: string): string | undefined => {
  const sec = (errors as Record<string, unknown> | null | undefined)?.[section];
  if (!sec || typeof sec !== "object" || Array.isArray(sec)) return undefined;
  const msg = (sec as Record<string, unknown>)[field];
  return msg === undefined ? undefined : flattenMessage(msg);
};

function ImportRowEditForm({
  row,
  errors,
  onCancel,
  onSave,
}: {
  row: ImportRow;
  errors?: ContractWriteErrors | null;
  onCancel: () => void;
  onSave: (row: ImportRow) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() => toDraft(row));
  const { data: landTypes = [] } = useGetLandTypesQuery();
  const { data: activityTypes = [] } = useGetActivityTypesQuery();
  const { data: privilegeTypes = [] } = useGetPrivilegeTypesQuery();

  const setContract = (f: ContractField, v: string) => setDraft((d) => ({ ...d, contract: { ...d.contract, [f]: v } }));
  const setRenter = (f: RenterField, v: string) => setDraft((d) => ({ ...d, renter: { ...d.renter, [f]: v } }));

  const typeOptions = useMemo(() => {
    const build = (types: RefType[]): Option[] => types.map((x) => ({ value: x.name, label: x.name }));
    return { lands: build(landTypes), activities: build(activityTypes), privileges: build(privilegeTypes) };
  }, [landTypes, activityTypes, privilegeTypes]);

  const contractInput = (f: ContractField) => {
    const error = sectionErr(errors, "contract", f);
    const isDate = DATE_FIELDS.has(f);
    return (
      <Field key={f} label={t(CONTRACT_LABELS[f])} error={error}>
        <TextInput
          type={isDate ? "date" : "text"}
          value={isDate ? toInputDate(draft.contract[f]) : draft.contract[f]}
          onChange={(v) => setContract(f, isDate ? toApiDate(v) : v)}
          invalid={!!error}
        />
      </Field>
    );
  };

  const typedBlock = (key: TypedKey, title: string) => {
    const secErrors = (errors as Record<string, unknown> | null | undefined)?.[key];
    const errorMap = secErrors && typeof secErrors === "object" && !Array.isArray(secErrors) ? (secErrors as Record<string, unknown>) : {};
    const consumed = new Set<string>();
    const rows = draft[key];
    return (
      <SectionCard title={title}>
        <div className="space-y-2">
          {rows.map((r, index) => {
            const err = errorMap[r.type] ?? errorMap[`${index + 1}-yozuv`];
            if (errorMap[r.type] !== undefined) consumed.add(r.type);
            else if (errorMap[`${index + 1}-yozuv`] !== undefined) consumed.add(`${index + 1}-yozuv`);
            const options = typeOptions[key].some((o) => o.value === r.type) || !r.type
              ? typeOptions[key]
              : [{ value: r.type, label: r.type }, ...typeOptions[key]];
            return (
              <div key={r.key}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                  <Field label={t("billing.import_type_name")}>
                    <SelectField
                      value={r.type}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, [key]: d[key].map((x, i) => (i === index ? { ...x, type: v } : x)) }))
                      }
                      options={options}
                      invalid={err !== undefined}
                    />
                  </Field>
                  <Field label={t("billing.form_area")}>
                    <TextInput
                      value={r.area}
                      decimal
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, [key]: d[key].map((x, i) => (i === index ? { ...x, area: v } : x)) }))
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("billing.form_delete_row")}
                    onClick={() => setDraft((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }))}
                    className="h-10 w-10 rounded-lg text-red-600"
                  >
                    <Trash2 />
                  </Button>
                </div>
                {err !== undefined && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{flattenMessage(err)}</p>
                )}
              </div>
            );
          })}
          {Object.entries(errorMap)
            .filter(([k]) => !consumed.has(k))
            .map(([k, v]) => (
              <p key={k} className="text-xs text-red-600 dark:text-red-400">
                {k}: {flattenMessage(v)}
              </p>
            ))}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setDraft((d) => ({ ...d, [key]: [...d[key], { key: nextKey(), type: "", area: "" }] }))}
          className="mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus />
          {t("billing.form_add_row")}
        </Button>
      </SectionCard>
    );
  };

  const generalErrors = Object.entries((errors ?? {}) as Record<string, unknown>)
    .filter(([section]) => !["contract", "renter", "action", "lands", "activities", "privileges"].includes(section))
    .map(([section, v]) => `${section}: ${flattenMessage(v)}`);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(fromDraft(draft, row));
      }}
    >
      {generalErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {generalErrors.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}
      <SectionCard title={t("billing.import_section_contract")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{CONTRACT_FIELDS.map(contractInput)}</div>
      </SectionCard>
      <SectionCard title={t("billing.import_section_renter")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RENTER_FIELDS.map((f) => {
            const error = sectionErr(errors, "renter", f);
            return (
              <Field key={f} label={t(RENTER_LABELS[f])} error={error}>
                <TextInput
                  value={draft.renter[f]}
                  onChange={(v) => setRenter(f, v)}
                  digitsOnly={f === "pinfl" || f === "stir" || f === "phone"}
                  maxLength={f === "pinfl" ? 14 : f === "stir" ? 9 : f === "phone" ? 13 : undefined}
                  invalid={!!error}
                />
              </Field>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard title={t("billing.import_section_action")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("billing.form_vacancy")} error={sectionErr(errors, "action", "vacancy")}>
            <TextInput value={draft.vacancy} onChange={(v) => setDraft((d) => ({ ...d, vacancy: v }))} decimal />
          </Field>
          <Field label={t("billing.form_own_investment")} error={sectionErr(errors, "action", "own_investment")}>
            <TextInput value={draft.own_investment} onChange={(v) => setDraft((d) => ({ ...d, own_investment: v }))} decimal />
          </Field>
        </div>
      </SectionCard>
      <SectionCard title={t("billing.import_section_products")}>
        <div className="space-y-2">
          {draft.products.map((p, index) => {
            const err =
              sectionErr(errors, "action_products", p.product_export) ??
              sectionErr(errors, "action_products", `${index + 1}-yozuv`);
            const setP = (f: keyof Omit<ProductDraft, "key">, v: string) =>
              setDraft((d) => ({ ...d, products: d.products.map((x, i) => (i === index ? { ...x, [f]: v } : x)) }));
            return (
              <div key={p.key}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <Field label={t("billing.form_product_export")}>
                    <TextInput value={p.product_export} onChange={(v) => setP("product_export", v)} invalid={!!err} />
                  </Field>
                  <Field label={t("billing.form_product_amount")}>
                    <TextInput value={p.product_amount} onChange={(v) => setP("product_amount", v)} decimal />
                  </Field>
                  <Field label={t("billing.form_export_amount")}>
                    <TextInput value={p.export_amount} onChange={(v) => setP("export_amount", v)} decimal />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("billing.form_delete_row")}
                    onClick={() => setDraft((d) => ({ ...d, products: d.products.filter((_, i) => i !== index) }))}
                    className="h-10 w-10 rounded-lg text-red-600"
                  >
                    <Trash2 />
                  </Button>
                </div>
                {err && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{err}</p>}
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              products: [...d.products, { key: nextKey(), product_export: "", product_amount: "", export_amount: "" }],
            }))
          }
          className="mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus />
          {t("billing.form_add_row")}
        </Button>
      </SectionCard>
      {typedBlock("lands", t("billing.import_section_lands"))}
      {typedBlock("activities", t("billing.import_section_activities"))}
      {typedBlock("privileges", t("billing.import_section_privileges"))}

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-white/95 dark:bg-slate-950/95 px-1 py-2 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {t("billing.form_cancel")}
        </Button>
        <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
          <Save />
          {t("billing.import_save_row")}
        </Button>
      </div>
    </form>
  );
}

function ImportRowEditDialog({ open, excelRow, row, errors, onOpenChange, onSave }: ImportRowEditDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-[96vw] overflow-y-auto rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {t("billing.import_edit_title", { row: excelRow ?? "" })}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("billing.import_edit_title", { row: excelRow ?? "" })}</DialogDescription>
        </DialogHeader>
        {open && row && excelRow !== null && (
          <ImportRowEditForm
            key={excelRow}
            row={row}
            errors={errors}
            onCancel={() => onOpenChange(false)}
            onSave={(next) => {
              onSave(next);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImportRowEditDialog;
