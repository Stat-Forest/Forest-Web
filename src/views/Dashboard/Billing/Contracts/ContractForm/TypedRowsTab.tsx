// 4–6-tablar: Yer turlari (ota tur → foydalanish turi → maydon), Faoliyat turlari,
// Imtiyozlar (billing ContractLandTypeForm / ContractActivityForm / ContractPrivilagesForm porti).
import { useMemo, type Dispatch } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RefType } from "@/features/billing/types";
import { Field, SectionCard, SectionErrors, SelectField, TextInput, type Option } from "./fields";
import type { FormAction, TypedAreaRow, TypedSection } from "./formState";

interface TypedRowsTabProps {
  section: TypedSection;
  rows: TypedAreaRow[];
  types: RefType[];
  dispatch: Dispatch<FormAction>;
  errorOf: (key: string) => string | undefined;
  sectionErrors?: string[];
  readOnly?: boolean;
}

const TYPE_LABEL_KEY: Record<TypedSection, string> = {
  lands: "billing.form_land_type",
  activities: "billing.form_activity_type",
  privileges: "billing.form_privilege_type",
};

function TypedRowsTab({ section, rows, types, dispatch, errorOf, sectionErrors, readOnly }: TypedRowsTabProps) {
  const { t } = useTranslation();
  const isLand = section === "lands";

  const parentOptions = useMemo<Option[]>(
    () => types.filter((x) => !x.parent).map((x) => ({ value: x.id, label: x.name })),
    [types],
  );
  const flatOptions = useMemo<Option[]>(
    () =>
      types.map((x) => ({
        value: x.id,
        label: x.parent && x.parent_name ? `${x.parent_name} → ${x.name}` : x.name,
      })),
    [types],
  );
  const childrenOf = (parentId: string): Option[] =>
    types.filter((x) => x.parent === parentId).map((x) => ({ value: x.id, label: x.name }));

  return (
    <div className="space-y-4">
      <SectionErrors messages={sectionErrors} />
      <SectionCard>
        {rows.length === 0 && (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t("billing.form_no_rows")}</p>
        )}
        <div className="space-y-3">
          {rows.map((row, index) => {
            const children = isLand ? childrenOf(row.parentType) : [];
            const rowError = errorOf(`${section}.${index}.row`);
            const areaError = errorOf(`${section}.${index}.area`);
            return (
              <div
                key={row.key}
                className={`rounded-xl border p-3 ${
                  rowError
                    ? "border-red-300 dark:border-red-900/70 bg-red-50/50 dark:bg-red-950/20"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className={`grid grid-cols-1 gap-3 ${isLand ? "md:grid-cols-[1fr_1fr_180px_auto]" : "md:grid-cols-[1fr_180px_auto]"} md:items-end`}>
                  {isLand ? (
                    <>
                      <Field label={t("billing.form_land_type")}>
                        <SelectField
                          value={row.parentType}
                          onChange={(v) => dispatch({ type: "typed_update", section, index, patch: { parentType: v } })}
                          options={parentOptions}
                          disabled={readOnly}
                        />
                      </Field>
                      <Field
                        label={t("billing.form_land_use_type")}
                        hint={row.parentType && children.length === 0 ? t("billing.form_no_children") : undefined}
                      >
                        <SelectField
                          value={row.type}
                          onChange={(v) => dispatch({ type: "typed_update", section, index, patch: { type: v } })}
                          options={children}
                          disabled={readOnly || !row.parentType || children.length === 0}
                        />
                      </Field>
                    </>
                  ) : (
                    <Field label={t(TYPE_LABEL_KEY[section])}>
                      <SelectField
                        value={row.type}
                        onChange={(v) => dispatch({ type: "typed_update", section, index, patch: { type: v } })}
                        options={flatOptions}
                        disabled={readOnly}
                      />
                    </Field>
                  )}
                  <Field label={t("billing.form_area")} error={areaError}>
                    <TextInput
                      value={row.area}
                      onChange={(v) => dispatch({ type: "typed_update", section, index, patch: { area: v } })}
                      placeholder={t("billing.form_area_ph")}
                      decimal
                      invalid={!!areaError}
                      disabled={readOnly}
                    />
                  </Field>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={t("billing.form_delete_row")}
                      aria-label={t("billing.form_delete_row")}
                      onClick={() => dispatch({ type: "typed_remove", section, index })}
                      className="h-10 w-10 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {rowError && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{rowError}</p>}
              </div>
            );
          })}
        </div>
        {!readOnly && (
          <Button
            type="button"
            onClick={() => dispatch({ type: "typed_add", section })}
            className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus />
            {t("billing.form_add_row")}
          </Button>
        )}
      </SectionCard>
    </div>
  );
}

export default TypedRowsTab;
