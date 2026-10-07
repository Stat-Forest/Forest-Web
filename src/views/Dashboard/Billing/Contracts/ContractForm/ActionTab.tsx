// 7-tab: Bajarilgan ishlar (billing ContractCreateActionForm.vue porti).
import type { Dispatch } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, SectionCard, SectionErrors, TextInput } from "./fields";
import type { ActionSection, FormAction, ProductRow } from "./formState";

interface ActionTabProps {
  action: ActionSection;
  products: ProductRow[];
  dispatch: Dispatch<FormAction>;
  errorOf: (key: string) => string | undefined;
  sectionErrors?: string[];
  readOnly?: boolean;
}

function ActionTab({ action, products, dispatch, errorOf, sectionErrors, readOnly }: ActionTabProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <SectionErrors messages={sectionErrors} />
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("billing.form_vacancy")} htmlFor="cf-vacancy" error={errorOf("action.vacancy")}>
            <TextInput
              id="cf-vacancy"
              value={action.vacancy}
              onChange={(v) => dispatch({ type: "action", field: "vacancy", value: v })}
              placeholder={t("billing.form_vacancy_ph")}
              digitsOnly
              maxLength={6}
              invalid={!!errorOf("action.vacancy")}
              disabled={readOnly}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t("billing.form_investment_legend")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("billing.form_own_investment")} htmlFor="cf-own-investment" error={errorOf("action.own_investment")}>
            <MoneyInput
              id="cf-own-investment"
              value={action.own_investment}
              onChange={(v) => dispatch({ type: "action", field: "own_investment", value: v })}
              placeholder={t("billing.form_own_investment_ph")}
              invalid={!!errorOf("action.own_investment")}
              disabled={readOnly}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t("billing.form_products_legend", { year })}>
        <div className="space-y-3">
          {products.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("billing.form_no_rows")}</p>
          )}
          {products.map((p, index) => {
            const rowError = errorOf(`products.${index}.row`);
            const err = (f: string) => errorOf(`products.${index}.${f}`);
            return (
              <div
                key={p.key}
                className={`rounded-xl border p-3 ${
                  rowError
                    ? "border-red-300 dark:border-red-900/70 bg-red-50/50 dark:bg-red-950/20"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                  <Field label={t("billing.form_product_export")} error={err("product_export")}>
                    <TextInput
                      value={p.product_export}
                      onChange={(v) => dispatch({ type: "product_update", index, field: "product_export", value: v })}
                      placeholder={t("billing.form_product_export_ph")}
                      maxLength={99}
                      invalid={!!err("product_export")}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label={t("billing.form_product_amount")} error={err("product_amount")}>
                    <TextInput
                      value={p.product_amount}
                      onChange={(v) => dispatch({ type: "product_update", index, field: "product_amount", value: v })}
                      placeholder={t("billing.form_product_amount_ph")}
                      decimal
                      invalid={!!err("product_amount")}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label={t("billing.form_export_amount")} error={err("export_amount")}>
                    <MoneyInput
                      value={p.export_amount}
                      onChange={(v) => dispatch({ type: "product_update", index, field: "export_amount", value: v })}
                      placeholder={t("billing.form_export_amount_ph")}
                      invalid={!!err("export_amount")}
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
                      onClick={() => dispatch({ type: "product_remove", index })}
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
            onClick={() => dispatch({ type: "product_add" })}
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

export default ActionTab;
