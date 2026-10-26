// Shartnoma yaratish/tahrirlash formasi — 7 tab (billing create.vue +
// ContractEditModal.vue porti). Yaratish sahifasida ham, tahrirlash dialogida
// ham ishlatiladi.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, Loader2, Save, SaveAll, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCreateContractMutation,
  useGetActivityTypesQuery,
  useGetBillingDistrictsQuery,
  useGetBillingRegionsQuery,
  useGetBolimlarQuery,
  useGetContractQuery,
  useGetLandTypesQuery,
  useGetPrivilegeTypesQuery,
  useGetXojaliklarQuery,
  useUpdateContractMutation,
  useUpdateContractYearlyAmountsMutation,
} from "@/services/billingApi";
import { useBillingAccess } from "@/features/billing/permissions";
import type { ContractDetail, ContractWriteYearlyAmount } from "@/features/billing/types";
import ActionTab from "./ActionTab";
import ContractTab from "./ContractTab";
import LandInfoTab from "./LandInfoTab";
import RenterTab from "./RenterTab";
import TypedRowsTab from "./TypedRowsTab";
import {
  buildPayload,
  createInitialState,
  extractWriteError,
  formReducer,
  mapServerErrors,
  payloadIndexMaps,
  TAB_LABEL_KEY,
  TAB_ORDER,
  tabOfErrorKey,
  validateForm,
  yearlyRowHasValue,
  yearlyRowToPayload,
  type FormAction,
  type ServerErrors,
  type TabId,
} from "./formState";

export interface ContractFormProps {
  mode: "create" | "edit";
  contractId?: string | null;
  /** "page" — gorizontal qadamlar; "dialog" — chap tomonda vertikal ro'yxat */
  layout?: "page" | "dialog";
  /** Yaratildi; `again` — "Saqlash va yana qo'shish" (forma allaqachon tozalangan) */
  onCreated?: (detail: ContractDetail, again: boolean) => void;
  onUpdated?: (detail: ContractDetail) => void;
  onClose: () => void;
}

const EMPTY_SERVER_ERRORS: ServerErrors = { fields: {}, sections: {} };

function ContractForm({ mode, contractId, layout = "page", onCreated, onUpdated, onClose }: ContractFormProps) {
  const { t } = useTranslation();
  const { canEdit } = useBillingAccess();
  const readOnly = !canEdit;
  const isEditing = mode === "edit";

  const [state, rawDispatch] = useReducer(formReducer, undefined, createInitialState);
  const [activeTab, setActiveTab] = useState<TabId>("contract");
  const [showClientErrors, setShowClientErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<ServerErrors>(EMPTY_SERVER_ERRORS);
  const [yearlyDirty, setYearlyDirty] = useState(false);
  /** Xaritani (BoundaryMap) qayta yaratish uchun — forma tozalanganda */
  const [formKey, setFormKey] = useState(0);
  const originalYearsRef = useRef<Set<number>>(new Set());
  const contentRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useCallback((action: FormAction) => {
    if (action.type === "yearly" || action.type === "yearly_set") setYearlyDirty(true);
    rawDispatch(action);
  }, []);

  // ---- Ma'lumotnoma
  const { data: xojaliklar = [] } = useGetXojaliklarQuery();
  const { data: bolimlar = [] } = useGetBolimlarQuery(state.contract.xojalik ? { xojalik: state.contract.xojalik } : skipToken);
  const { data: regions = [] } = useGetBillingRegionsQuery();
  const { data: districts = [] } = useGetBillingDistrictsQuery(state.contract.region ? { region: state.contract.region } : skipToken);
  const { data: landTypes = [] } = useGetLandTypesQuery();
  const { data: activityTypes = [] } = useGetActivityTypesQuery();
  const { data: privilegeTypes = [] } = useGetPrivilegeTypesQuery();

  // ---- Tahrirlash: shartnomani yuklash
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useGetContractQuery(isEditing && contractId ? contractId : skipToken, { refetchOnMountOrArgChange: true });

  useEffect(() => {
    if (!isEditing || !detail || state.loadedId === detail.id) return;
    originalYearsRef.current = new Set(detail.yearly_amounts.map((y) => y.year));
    rawDispatch({ type: "load", detail });
    setYearlyDirty(false);
  }, [isEditing, detail, state.loadedId]);

  const [createContract, { isLoading: creating }] = useCreateContractMutation();
  const [updateContract, { isLoading: updating }] = useUpdateContractMutation();
  const [updateYearly, { isLoading: savingYearly }] = useUpdateContractYearlyAmountsMutation();
  const saving = creating || updating;

  // ---- Xatolar
  const clientErrors = useMemo(() => validateForm(state, t, landTypes), [state, t, landTypes]);
  const errorOf = useCallback(
    (key: string): string | undefined =>
      (showClientErrors ? clientErrors[key]?.message : undefined) ?? serverErrors.fields[key],
    [showClientErrors, clientErrors, serverErrors],
  );

  const errorCountByTab = useMemo(() => {
    const counts: Partial<Record<TabId, number>> = {};
    const inc = (tab: TabId, n = 1) => {
      counts[tab] = (counts[tab] ?? 0) + n;
    };
    if (showClientErrors) Object.values(clientErrors).forEach((e) => inc(e.tab));
    Object.keys(serverErrors.fields).forEach((key) => {
      if (!(showClientErrors && clientErrors[key])) inc(tabOfErrorKey(key));
    });
    (Object.keys(serverErrors.sections) as TabId[]).forEach((tab) => inc(tab, serverErrors.sections[tab]?.length ?? 0));
    return counts;
  }, [showClientErrors, clientErrors, serverErrors]);

  const tabNames = (tabs: TabId[]) => tabs.map((tab) => t(TAB_LABEL_KEY[tab])).join(", ");

  const goToTab = (tab: TabId) => {
    setActiveTab(tab);
    contentRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  };

  // ---- Yillik summalar (tahrirlash) — alohida PATCH
  const yearlyRowsForPatch = (): ContractWriteYearlyAmount[] =>
    state.yearly.filter((r) => yearlyRowHasValue(r) || originalYearsRef.current.has(r.year)).map(yearlyRowToPayload);

  const handleSaveYearly = async () => {
    if (!contractId || readOnly) return;
    const yearlyKeys = Object.keys(clientErrors).filter((k) => k.startsWith("yearly."));
    if (yearlyKeys.length) {
      setShowClientErrors(true);
      toast.error(t("billing.form_fix_errors"));
      return;
    }
    try {
      const res = await updateYearly({ id: contractId, body: { yearly_amounts: yearlyRowsForPatch() } }).unwrap();
      originalYearsRef.current = new Set(res.yearly_amounts.map((y) => y.year));
      setYearlyDirty(false);
      setServerErrors((prev) => ({
        fields: Object.fromEntries(Object.entries(prev.fields).filter(([k]) => !k.startsWith("yearly."))),
        sections: prev.sections,
      }));
      toast.success(t("billing.form_yearly_saved"));
    } catch (err) {
      const { errors, message } = extractWriteError(err);
      if (errors) {
        setServerErrors(mapServerErrors(errors, t, {}, state));
      }
      toast.error(message || t("billing.form_yearly_save_error"));
    }
  };

  // ---- Saqlash
  const resetForm = () => {
    rawDispatch({ type: "reset" });
    setServerErrors(EMPTY_SERVER_ERRORS);
    setShowClientErrors(false);
    setYearlyDirty(false);
    setActiveTab("contract");
    setFormKey((k) => k + 1);
  };

  const handleSave = async (again = false) => {
    if (readOnly || saving) return;
    setServerErrors(EMPTY_SERVER_ERRORS);
    const errors = validateForm(state, t, landTypes);
    const errorTabs = TAB_ORDER.filter((tab) => Object.values(errors).some((e) => e.tab === tab));
    if (errorTabs.length) {
      setShowClientErrors(true);
      toast.error(t("billing.form_errors_in_tabs", { tabs: tabNames(errorTabs) }));
      if (!errorTabs.includes(activeTab)) goToTab(errorTabs[0]);
      return;
    }

    const payload = buildPayload(state, isEditing, landTypes);
    if (isEditing && yearlyDirty) payload.yearly_amounts = yearlyRowsForPatch();
    const indexMaps = payloadIndexMaps(state, landTypes);

    try {
      if (isEditing) {
        if (!contractId) return;
        const result = await updateContract({ id: contractId, body: payload }).unwrap();
        toast.success(t("billing.form_updated"));
        setYearlyDirty(false);
        onUpdated?.(result);
      } else {
        const result = await createContract(payload).unwrap();
        toast.success(t("billing.form_created"));
        if (again) resetForm();
        onCreated?.(result, again);
      }
    } catch (err) {
      const { errors, message } = extractWriteError(err);
      if (errors) {
        const mapped = mapServerErrors(errors, t, indexMaps, state);
        setServerErrors(mapped);
        const tabs = TAB_ORDER.filter(
          (tab) =>
            Object.keys(mapped.fields).some((k) => tabOfErrorKey(k) === tab) || !!mapped.sections[tab]?.length,
        );
        toast.error(
          tabs.length ? t("billing.form_errors_in_tabs", { tabs: tabNames(tabs) }) : message || t("billing.form_save_error"),
        );
        if (tabs.length && !tabs.includes(activeTab)) goToTab(tabs[0]);
      } else {
        toast.error(message || t("billing.form_save_error"));
      }
    }
  };

  // ---- Navigatsiya
  const tabIndex = TAB_ORDER.indexOf(activeTab);
  const isLast = tabIndex === TAB_ORDER.length - 1;

  if (isEditing && (detailLoading || (!detail && !detailError) || (detail && state.loadedId !== detail.id))) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="animate-spin text-blue-600" size={18} />
        {t("billing.form_loading")}
      </div>
    );
  }
  if (isEditing && detailError) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm">
        <p className="font-medium text-red-600 dark:text-red-400">{t("billing.form_load_error")}</p>
        <Button type="button" variant="outline" onClick={() => void refetchDetail()}>
          {t("billing.form_retry")}
        </Button>
      </div>
    );
  }

  const saveButton = (
    <Button
      type="button"
      onClick={() => void handleSave(false)}
      disabled={saving}
      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
    >
      {saving ? <Loader2 className="animate-spin" /> : <Save />}
      {saving ? t("billing.form_saving") : t("billing.form_save")}
    </Button>
  );

  const tabList = (
    <ol
      role="tablist"
      aria-orientation={layout === "dialog" ? "vertical" : "horizontal"}
      className={cn(
        "flex gap-1.5",
        layout === "dialog"
          ? "flex-row flex-wrap lg:flex-col lg:flex-nowrap lg:sticky lg:top-0"
          : "overflow-x-auto pb-1 [scrollbar-width:thin]",
      )}
    >
      {TAB_ORDER.map((tab, i) => {
        const active = tab === activeTab;
        const count = errorCountByTab[tab] ?? 0;
        return (
          <li key={tab} role="presentation" className={layout === "dialog" ? "lg:w-full" : "shrink-0"}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                active
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-blue-600",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1">{t(TAB_LABEL_KEY[tab])}</span>
              {count > 0 && (
                <span
                  className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white"
                  aria-label={`${count}`}
                >
                  {count}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );

  const content = (
    <div ref={contentRef} role="tabpanel" className="min-w-0 scroll-mt-4" key={`${activeTab}-${formKey}`}>
      {activeTab === "contract" && (
        <>
          {serverErrors.sections.contract?.length ? (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <ul className="list-disc space-y-0.5 pl-5">
                {serverErrors.sections.contract.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ContractTab
            contract={state.contract}
            yearly={state.yearly}
            dispatch={dispatch}
            errorOf={errorOf}
            xojaliklar={xojaliklar}
            bolimlar={bolimlar}
            regions={regions}
            districts={districts}
            readOnly={readOnly}
            onSaveYearly={isEditing && !readOnly ? () => void handleSaveYearly() : undefined}
            savingYearly={savingYearly}
          />
        </>
      )}
      {activeTab === "renter" && (
        <>
          {serverErrors.sections.renter?.length ? (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400">{serverErrors.sections.renter.join("; ")}</p>
          ) : null}
          <RenterTab renter={state.renter} dispatch={dispatch} errorOf={errorOf} regions={regions} readOnly={readOnly} />
        </>
      )}
      {activeTab === "land" && (
        <LandInfoTab
          landInfo={state.landInfo}
          dispatch={dispatch}
          errorOf={errorOf}
          sectionErrors={serverErrors.sections.land}
          contractId={isEditing ? contractId : null}
          readOnly={readOnly}
        />
      )}
      {activeTab === "lands" && (
        <TypedRowsTab
          section="lands"
          rows={state.lands}
          types={landTypes}
          dispatch={dispatch}
          errorOf={errorOf}
          sectionErrors={serverErrors.sections.lands}
          readOnly={readOnly}
        />
      )}
      {activeTab === "activities" && (
        <TypedRowsTab
          section="activities"
          rows={state.activities}
          types={activityTypes}
          dispatch={dispatch}
          errorOf={errorOf}
          sectionErrors={serverErrors.sections.activities}
          readOnly={readOnly}
        />
      )}
      {activeTab === "privileges" && (
        <TypedRowsTab
          section="privileges"
          rows={state.privileges}
          types={privilegeTypes}
          dispatch={dispatch}
          errorOf={errorOf}
          sectionErrors={serverErrors.sections.privileges}
          readOnly={readOnly}
        />
      )}
      {activeTab === "action" && (
        <ActionTab
          action={state.action}
          products={state.products}
          dispatch={dispatch}
          errorOf={errorOf}
          sectionErrors={serverErrors.sections.action}
          readOnly={readOnly}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Yuqori tugmalar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
          <X />
          {t("billing.form_close")}
        </Button>
        {!readOnly && saveButton}
        {!readOnly && !isEditing && (
          <Button
            type="button"
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {saving ? <Loader2 className="animate-spin" /> : <SaveAll />}
            {t("billing.form_save_and_new")}
          </Button>
        )}
      </div>

      {layout === "dialog" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <div className="lg:border-r lg:border-slate-200 lg:dark:border-slate-800 lg:pr-3">{tabList}</div>
          {content}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-2 shadow-xs">
            {tabList}
          </div>
          {content}
        </>
      )}

      {/* Ortga / Oldinga */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {tabIndex > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => goToTab(TAB_ORDER[tabIndex - 1])}
            className="rounded-xl min-w-28"
          >
            <ArrowLeft />
            {t("billing.form_back")}
          </Button>
        )}
        {!isLast ? (
          <Button
            type="button"
            onClick={() => goToTab(TAB_ORDER[tabIndex + 1])}
            className="rounded-xl min-w-28 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t("billing.form_next")}
            <ArrowRight />
          </Button>
        ) : (
          !readOnly && saveButton
        )}
      </div>
    </div>
  );
}

export default ContractForm;
