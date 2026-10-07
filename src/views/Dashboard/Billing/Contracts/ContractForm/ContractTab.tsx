// 1-tab: Shartnoma (billing CreateContractForm.vue porti).
import { useMemo, type Dispatch } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import type { BillingDistrict, BillingRegion, Bolim, Xojalik } from "@/features/billing/types";
import { Field, MoneyInput, SectionCard, SelectField, TextInput, type Option } from "./fields";
import YearlyAmountsTable from "./YearlyAmountsTable";
import { hasYearlyData, type ContractSection, type FormAction, type YearlyRow } from "./formState";

interface ContractTabProps {
  contract: ContractSection;
  yearly: YearlyRow[];
  dispatch: Dispatch<FormAction>;
  errorOf: (key: string) => string | undefined;
  xojaliklar: Xojalik[];
  bolimlar: Bolim[];
  regions: BillingRegion[];
  districts: BillingDistrict[];
  readOnly?: boolean;
  /** Tahrirlash rejimida yillik summalar alohida saqlanadi */
  onSaveYearly?: () => void;
  savingYearly?: boolean;
}

function ContractTab({
  contract,
  yearly,
  dispatch,
  errorOf,
  xojaliklar,
  bolimlar,
  regions,
  districts,
  readOnly,
  onSaveYearly,
  savingYearly,
}: ContractTabProps) {
  const { t } = useTranslation();
  const set = (field: keyof ContractSection) => (value: string) => dispatch({ type: "contract", field, value });

  const xojalikOptions = useMemo<Option[]>(
    () =>
      xojaliklar
        .filter((x) => x.is_active || x.id === contract.xojalik)
        .map((x) => ({ value: x.id, label: x.inn ? `${x.name} (${x.inn})` : x.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "uz")),
    [xojaliklar, contract.xojalik],
  );
  const bolimOptions = useMemo<Option[]>(
    () =>
      bolimlar
        .filter((b) => !contract.xojalik || b.xojalik === contract.xojalik)
        .map((b) => ({ value: b.id, label: b.name })),
    [bolimlar, contract.xojalik],
  );
  const regionOptions = useMemo<Option[]>(() => regions.map((r) => ({ value: r.id, label: r.name })), [regions]);
  const districtOptions = useMemo<Option[]>(
    () => districts.filter((d) => !contract.region || d.region === contract.region).map((d) => ({ value: d.id, label: d.name })),
    [districts, contract.region],
  );

  // INN to'liq kiritilsa — xo'jalik avtomatik tanlanadi
  const handleInnChange = (value: string) => {
    const inn = value.replace(/\D/g, "");
    const found = inn ? xojaliklar.find((x) => x.inn === inn) : undefined;
    if (found) {
      dispatch({
        type: "contract_patch",
        patch: {
          xojalik_inn: inn,
          xojalik: found.id,
          bolim: found.id === contract.xojalik ? contract.bolim : "",
          region: contract.region || found.region || "",
        },
      });
    } else {
      dispatch({ type: "contract", field: "xojalik_inn", value: inn });
    }
  };

  const handleXojalikChange = (id: string) => {
    const found = xojaliklar.find((x) => x.id === id);
    dispatch({
      type: "contract_patch",
      patch: {
        xojalik: id,
        xojalik_inn: found?.inn ?? "",
        bolim: id === contract.xojalik ? contract.bolim : "",
        region: contract.region || found?.region || "",
        district: contract.region || !found?.region ? contract.district : "",
      },
    });
  };

  const handleRegionChange = (id: string) => {
    dispatch({ type: "contract_patch", patch: { region: id, district: "" } });
  };

  const showAmountInputs = !hasYearlyData(yearly);

  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={t("billing.form_contract_date")} htmlFor="cf-contract-date" required error={errorOf("contract.contract_date")}>
            <TextInput
              id="cf-contract-date"
              type="date"
              value={contract.contract_date}
              onChange={set("contract_date")}
              invalid={!!errorOf("contract.contract_date")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_expired_date")} htmlFor="cf-expired-date" error={errorOf("contract.expired_date")}>
            <TextInput
              id="cf-expired-date"
              type="date"
              value={contract.expired_date}
              onChange={set("expired_date")}
              invalid={!!errorOf("contract.expired_date")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_contract_number")} htmlFor="cf-contract-number" error={errorOf("contract.contract_number")}>
            <TextInput
              id="cf-contract-number"
              value={contract.contract_number}
              onChange={set("contract_number")}
              placeholder={t("billing.form_contract_number_ph")}
              invalid={!!errorOf("contract.contract_number")}
              maxLength={200}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_auction_date")} htmlFor="cf-auction-date" error={errorOf("contract.auction_date")}>
            <TextInput
              id="cf-auction-date"
              type="date"
              value={contract.auction_date}
              onChange={set("auction_date")}
              invalid={!!errorOf("contract.auction_date")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_exemptioned_date")} htmlFor="cf-exemptioned-date" error={errorOf("contract.exemptioned_date")}>
            <TextInput
              id="cf-exemptioned-date"
              type="date"
              value={contract.exemptioned_date}
              onChange={set("exemptioned_date")}
              invalid={!!errorOf("contract.exemptioned_date")}
              disabled={readOnly}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={t("billing.form_xojalik_inn")} htmlFor="cf-xojalik-inn" error={errorOf("contract.xojalik_inn")}>
            <TextInput
              id="cf-xojalik-inn"
              value={contract.xojalik_inn}
              onChange={handleInnChange}
              placeholder={t("billing.form_xojalik_inn_ph")}
              digitsOnly
              maxLength={9}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_xojalik")} htmlFor="cf-xojalik" required error={errorOf("contract.xojalik")}>
            <SelectField
              id="cf-xojalik"
              value={contract.xojalik}
              onChange={handleXojalikChange}
              options={xojalikOptions}
              invalid={!!errorOf("contract.xojalik")}
              allowEmpty={false}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_bolim")} htmlFor="cf-bolim" error={errorOf("contract.bolim")}>
            <SelectField
              id="cf-bolim"
              value={contract.bolim}
              onChange={set("bolim")}
              options={bolimOptions}
              invalid={!!errorOf("contract.bolim")}
              disabled={readOnly || !contract.xojalik}
            />
          </Field>
          <Field label={t("billing.form_region")} htmlFor="cf-region" error={errorOf("contract.region")}>
            <SelectField
              id="cf-region"
              value={contract.region}
              onChange={handleRegionChange}
              options={regionOptions}
              invalid={!!errorOf("contract.region")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_district")} htmlFor="cf-district" error={errorOf("contract.district")}>
            <SelectField
              id="cf-district"
              value={contract.district}
              onChange={set("district")}
              options={districtOptions}
              invalid={!!errorOf("contract.district")}
              disabled={readOnly || !contract.region}
            />
          </Field>
        </div>
      </SectionCard>

      {showAmountInputs ? (
        <SectionCard>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("billing.form_rent_amount")} htmlFor="cf-rent-amount" error={errorOf("contract.rent_amount")}>
              <MoneyInput
                id="cf-rent-amount"
                value={contract.rent_amount}
                onChange={set("rent_amount")}
                placeholder={t("billing.form_rent_amount_ph")}
                invalid={!!errorOf("contract.rent_amount")}
                disabled={readOnly}
              />
            </Field>
            <Field label={t("billing.form_paid_amount")} htmlFor="cf-paid-amount" error={errorOf("contract.paid_amount")}>
              <MoneyInput
                id="cf-paid-amount"
                value={contract.paid_amount}
                onChange={set("paid_amount")}
                placeholder={t("billing.form_paid_amount_ph")}
                invalid={!!errorOf("contract.paid_amount")}
                disabled={readOnly}
              />
            </Field>
            <Field label={t("billing.form_penalty_amount")} htmlFor="cf-penalty-amount" error={errorOf("contract.penalty_amount")}>
              <MoneyInput
                id="cf-penalty-amount"
                value={contract.penalty_amount}
                onChange={set("penalty_amount")}
                placeholder={t("billing.form_penalty_amount_ph")}
                invalid={!!errorOf("contract.penalty_amount")}
                disabled={readOnly}
              />
            </Field>
          </div>
        </SectionCard>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <Info size={16} className="mt-0.5 shrink-0" />
          {t("billing.form_amounts_from_yearly")}
        </div>
      )}

      <SectionCard title={t("billing.form_yearly_title")}>
        <YearlyAmountsTable
          rows={yearly}
          onChange={(index, field, value) => dispatch({ type: "yearly", index, field, value })}
          errorOf={errorOf}
          readOnly={readOnly}
          onSave={onSaveYearly}
          saving={savingYearly}
        />
      </SectionCard>
    </div>
  );
}

export default ContractTab;
