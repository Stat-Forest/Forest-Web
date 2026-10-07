// 2-tab: Ijarachi haqida ma'lumot (billing ContractCreateUserForm.vue porti).
import { useMemo, type Dispatch } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import type { BillingRegion } from "@/features/billing/types";
import { Field, SectionCard, SelectField, TextInput, type Option } from "./fields";
import type { FormAction, RenterSection } from "./formState";

interface RenterTabProps {
  renter: RenterSection;
  dispatch: Dispatch<FormAction>;
  errorOf: (key: string) => string | undefined;
  regions: BillingRegion[];
  readOnly?: boolean;
}

function RenterTab({ renter, dispatch, errorOf, regions, readOnly }: RenterTabProps) {
  const { t } = useTranslation();
  const set = (field: keyof RenterSection) => (value: string | boolean) => dispatch({ type: "renter", field, value });

  const stirFilled = renter.stir.trim() !== "";
  const pinflFilled = renter.pinfl.trim() !== "";

  const birthPlaceOptions = useMemo<Option[]>(() => {
    const opts = regions.map((r) => ({ value: r.name, label: r.name }));
    if (renter.birth_place && !opts.some((o) => o.value === renter.birth_place)) {
      opts.unshift({ value: renter.birth_place, label: renter.birth_place });
    }
    return opts;
  }, [regions, renter.birth_place]);

  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("billing.form_stir")} htmlFor="cf-stir" error={errorOf("renter.stir")}>
            <TextInput
              id="cf-stir"
              value={renter.stir}
              onChange={set("stir")}
              placeholder={t("billing.form_stir_ph")}
              digitsOnly
              maxLength={9}
              invalid={!!errorOf("renter.stir")}
              // Faqat bittasi: JSHSHIR to'ldirilgan va INN bo'sh bo'lsa — INN o'chiriladi
              // (eski yozuvlarda ikkalasi ham bo'lsa, ikkalasi ham tahrirlanadi)
              disabled={readOnly || (!stirFilled && pinflFilled)}
            />
          </Field>
          <Field label={t("billing.form_pinfl")} htmlFor="cf-pinfl" error={errorOf("renter.pinfl")}>
            <TextInput
              id="cf-pinfl"
              value={renter.pinfl}
              onChange={set("pinfl")}
              placeholder={t("billing.form_pinfl_ph")}
              digitsOnly
              maxLength={14}
              invalid={!!errorOf("renter.pinfl")}
              disabled={readOnly || (!pinflFilled && stirFilled)}
            />
          </Field>
          <Field label={t("billing.form_full_name")} htmlFor="cf-full-name" error={errorOf("renter.full_name")} className="md:col-span-2">
            <TextInput
              id="cf-full-name"
              value={renter.full_name}
              onChange={set("full_name")}
              placeholder={t("billing.form_full_name_ph")}
              maxLength={255}
              invalid={!!errorOf("renter.full_name")}
              disabled={readOnly}
            />
          </Field>
          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              id="cf-legal"
              checked={renter.is_legal_entity}
              onCheckedChange={(v) => set("is_legal_entity")(v === true)}
              disabled={readOnly}
            />
            <label htmlFor="cf-legal" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              {t("billing.form_is_legal_entity")}
            </label>
          </div>
          {renter.is_legal_entity && (
            <Field label={t("billing.form_legal_name")} htmlFor="cf-legal-name" error={errorOf("renter.legal_name")} className="md:col-span-2">
              <TextInput
                id="cf-legal-name"
                value={renter.legal_name}
                onChange={set("legal_name")}
                placeholder={t("billing.form_legal_name_ph")}
                maxLength={255}
                invalid={!!errorOf("renter.legal_name")}
                disabled={readOnly}
              />
            </Field>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("billing.form_passport")} htmlFor="cf-passport" error={errorOf("renter.passport")}>
            <TextInput
              id="cf-passport"
              value={renter.passport}
              onChange={(v) => set("passport")(v.toUpperCase().replace(/\s/g, ""))}
              placeholder={t("billing.form_passport_ph")}
              maxLength={9}
              invalid={!!errorOf("renter.passport")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_phone")} htmlFor="cf-phone" error={errorOf("renter.phone")}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">+</span>
              <TextInput
                id="cf-phone"
                value={renter.phone}
                onChange={set("phone")}
                placeholder={t("billing.form_phone_ph")}
                digitsOnly
                maxLength={12}
                inputMode="tel"
                invalid={!!errorOf("renter.phone")}
                disabled={readOnly}
                className="pl-6"
              />
            </div>
          </Field>
          <Field label={t("billing.form_citizenship")} htmlFor="cf-citizenship" error={errorOf("renter.citizenship")}>
            <TextInput
              id="cf-citizenship"
              value={renter.citizenship}
              onChange={set("citizenship")}
              placeholder={t("billing.form_citizenship_ph")}
              maxLength={255}
              invalid={!!errorOf("renter.citizenship")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_birth_place")} htmlFor="cf-birth-place" error={errorOf("renter.birth_place")}>
            <SelectField
              id="cf-birth-place"
              value={renter.birth_place}
              onChange={(v) => set("birth_place")(v)}
              options={birthPlaceOptions}
              placeholder={t("billing.form_birth_place_ph")}
              invalid={!!errorOf("renter.birth_place")}
              disabled={readOnly}
            />
          </Field>
          <Field label={t("billing.form_per_adr")} htmlFor="cf-per-adr" error={errorOf("renter.per_adr")} className="md:col-span-2">
            <TextInput
              id="cf-per-adr"
              value={renter.per_adr}
              onChange={set("per_adr")}
              placeholder={t("billing.form_per_adr_ph")}
              maxLength={255}
              invalid={!!errorOf("renter.per_adr")}
              disabled={readOnly}
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

export default RenterTab;
