import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AlertTriangle, FileX2, Loader2 } from "lucide-react";
import BillingLayout from "../BillingLayout";
import { useBillingAccess } from "@/features/billing/permissions";
import type { ContractListItem, ContractStatusFilter } from "@/features/billing/types";
import {
  useDownloadImportTemplateMutation,
  useExportContractsExcelMutation,
  useGetContractsCountsQuery,
  useGetContractsQuery,
  useGetContractsSummaryQuery,
} from "@/services/billingApi";
import { getApiErrorMessage, triggerBlobDownload } from "@/utils/downloadFile";
import StatusCards from "./components/StatusCards";
import SummaryCards from "./components/SummaryCards";
import ContractsToolbar from "./components/ContractsToolbar";
import ContractsTable from "./components/ContractsTable";
import ContractsGrid from "./components/ContractsGrid";
import ContractsPagination from "./components/ContractsPagination";
import {
  EMPTY_CONTRACTS_FILTERS,
  buildContractsSearchParams,
  exportParams,
  filtersToApi,
  hasActiveContractsFilters,
  listParams,
  parseContractsSearchParams,
  readViewMode,
  storeViewMode,
  summaryParams,
  type ContractsFilterState,
  type ContractsUrlState,
  type ContractsViewMode,
  type YearParam,
} from "./components/contractsFilters";
import type { ContractDialogKind, ContractDialogTarget } from "./components/contractDialogTypes";
import FilterDialog from "./modals/FilterDialog";
import ContractDialogs from "./modals/ContractDialogs";

// recharts alohida chunk'da — jadval statistikani kutmasdan chiziladi
const RentRevenueStats = lazy(() => import("@/components/Charts/RentRevenueStats"));

/** /billing/contracts — Shartnomalar monitoring (spec §4.5). Filtrlar/sahifa URL'da. */
function ContractsPage() {
  const { t } = useTranslation();
  const { canEdit } = useBillingAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlState = useMemo(() => parseContractsSearchParams(searchParams), [searchParams]);
  const { filters, status, page, perPage, year } = urlState;
  const hasFilters = hasActiveContractsFilters(filters);

  const updateUrl = useCallback(
    (patch: Partial<ContractsUrlState>) => {
      setSearchParams(buildContractsSearchParams({ ...urlState, ...patch }), { replace: false });
    },
    [urlState, setSearchParams],
  );

  // ---- Ma'lumotlar ----
  const listArgs = useMemo(() => listParams(urlState), [urlState]);
  const summaryArgs = useMemo(() => summaryParams(urlState), [urlState]);
  const countsArgs = useMemo(() => filtersToApi(filters), [filters]);

  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    isError: listError,
    refetch: refetchList,
  } = useGetContractsQuery(listArgs);
  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useGetContractsSummaryQuery(summaryArgs);
  const {
    data: counts,
    isLoading: countsLoading,
    isFetching: countsFetching,
    refetch: refetchCounts,
  } = useGetContractsCountsQuery(countsArgs);

  const contracts = listData?.results ?? [];
  const count = listData?.count ?? 0;
  const refreshing = listFetching || summaryFetching || countsFetching;

  const refetchAll = useCallback(() => {
    refetchList();
    refetchSummary();
    refetchCounts();
  }, [refetchList, refetchSummary, refetchCounts]);

  // ---- Ko'rinish (jadval / grid) ----
  const [viewMode, setViewMode] = useState<ContractsViewMode>(() => readViewMode());
  const changeViewMode = (mode: ContractsViewMode) => {
    setViewMode(mode);
    storeViewMode(mode);
  };

  // ---- Filtr dialogi ----
  const [filterOpen, setFilterOpen] = useState(false);
  const applyFilters = (next: ContractsFilterState) => {
    updateUrl({ filters: next, page: 1 });
    setFilterOpen(false);
  };
  const clearFilters = () => {
    updateUrl({ filters: EMPTY_CONTRACTS_FILTERS, page: 1 });
    setFilterOpen(false);
  };

  const changeStatus = (next: ContractStatusFilter) => updateUrl({ status: next, page: 1 });
  const changeYear = (next: YearParam) => updateUrl({ year: next });
  const changePage = (next: number) => {
    updateUrl({ page: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Excel eksport / na'muna ----
  const [exportExcel, { isLoading: exporting }] = useExportContractsExcelMutation();
  const [downloadTemplate, { isLoading: downloadingTemplate }] = useDownloadImportTemplateMutation();

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportExcel(exportParams(urlState)).unwrap();
      triggerBlobDownload(blob, filename);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_export_error")));
    }
  };
  const handleTemplate = async () => {
    try {
      const { blob, filename } = await downloadTemplate().unwrap();
      triggerBlobDownload(blob, filename);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_template_error")));
    }
  };

  // ---- Shartnoma dialoglari (⋮ amallar, holat select, fayllar, xarita, tarix) ----
  const [dialog, setDialog] = useState<ContractDialogTarget | null>(null);
  const openDialog = useCallback((kind: ContractDialogKind, contract: ContractListItem) => {
    setDialog({ kind, contract });
  }, []);

  const showEmpty = !listLoading && !listError && contracts.length === 0;

  return (
    <BillingLayout title={t("billing.contracts_title")}>
      <Suspense
        fallback={
          <div className="h-[420px] w-full animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90" />
        }
      >
        <RentRevenueStats mode="contracts" title={t("rent_stats.title")} />
      </Suspense>
      <StatusCards counts={counts} loading={countsLoading} status={status} onChange={changeStatus} />
      <SummaryCards summary={summary} loading={summaryLoading} year={year} onYearChange={changeYear} />
      <ContractsToolbar
        canEdit={canEdit}
        hasFilters={hasFilters}
        refreshing={refreshing}
        exporting={exporting}
        downloadingTemplate={downloadingTemplate}
        viewMode={viewMode}
        onOpenFilter={() => setFilterOpen(true)}
        onRefresh={refetchAll}
        onExport={handleExport}
        onTemplate={handleTemplate}
        onViewModeChange={changeViewMode}
      />

      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors">
        {listError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm p-3">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">{t("billing.contracts_load_error")}</span>
            <button type="button" className="font-semibold underline cursor-pointer" onClick={refetchAll}>
              {t("billing.contracts_refresh")}
            </button>
          </div>
        )}

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3 text-slate-500 dark:text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FileX2 size={26} />
            </div>
            <p className="text-sm font-medium">{t("billing.contracts_empty")}</p>
            {hasFilters && (
              <button type="button" className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer" onClick={clearFilters}>
                {t("billing.clear")}
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <ContractsTable contracts={contracts} loading={listLoading} canEdit={canEdit} onOpen={openDialog} />
        ) : (
          <ContractsGrid contracts={contracts} loading={listLoading} canEdit={canEdit} onOpen={openDialog} />
        )}

        {count > 0 && (
          <ContractsPagination page={page} perPage={perPage} count={count} disabled={listFetching} onPageChange={changePage} />
        )}

        {listFetching && !listLoading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 size={16} className="animate-spin" />
            {t("billing.contracts_fetching")}
          </div>
        )}
      </div>

      <FilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={applyFilters}
        onClear={clearFilters}
      />
      <ContractDialogs target={dialog} canEdit={canEdit} onClose={() => setDialog(null)} onChanged={refetchAll} />
    </BillingLayout>
  );
}

export default ContractsPage;
