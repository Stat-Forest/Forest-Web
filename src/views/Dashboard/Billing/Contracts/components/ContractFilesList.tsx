import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Download, ExternalLink, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/features/billing/format";
import type { ContractFile, UUID } from "@/features/billing/types";
import { useDeleteContractFileMutation, useGetContractFilesQuery } from "@/services/billingApi";
import { getApiErrorMessage } from "@/utils/downloadFile";
import ContractFileUploadFields from "./ContractFileUploadFields";

interface ContractFilesListProps {
  contractId: UUID;
  canEdit: boolean;
  /** Bo'lsa ro'yxat tepasida "Yangi fayl yuklash" tugmasi (canEdit bo'lganda). Standart: true. */
  allowUpload?: boolean;
}

/**
 * Shartnoma fayllari ro'yxati (fayl nomi, yuklagan, sana) + Ko'rish / Yuklab olish /
 * O'chirish (canEdit, AlertDialog) + yangi fayl yuklash. FilesDialog va detail'da ishlatiladi.
 */
function ContractFilesList({ contractId, canEdit, allowUpload = true }: ContractFilesListProps) {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useGetContractFilesQuery({ contract: contractId, per_page: 20 });
  const [deleteFile, { isLoading: deleting }] = useDeleteContractFileMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ContractFile | null>(null);

  const files = data?.results ?? [];

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteFile({ id: toDelete.id, contract: contractId }).unwrap();
      toast.success(t("billing.contracts_file_deleted"));
      setToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_file_delete_error")));
    }
  };

  const openFile = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      {canEdit && allowUpload && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant={uploadOpen ? "outline" : "default"}
            size="sm"
            className={`rounded-xl font-semibold ${uploadOpen ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            onClick={() => setUploadOpen((v) => !v)}
          >
            <Plus size={16} />
            {t("billing.contracts_upload_new")}
          </Button>
        </div>
      )}
      {canEdit && allowUpload && uploadOpen && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4">
          <ContractFileUploadFields
            contractId={contractId}
            autoFocus
            onUploaded={() => {
              setUploadOpen(false);
              refetch();
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm p-3">
          {t("billing.load_error")}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2 text-slate-500 dark:text-slate-400">
          <FileText size={28} className="opacity-60" />
          <p className="text-sm">{t("billing.contracts_files_empty")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={f.file_name}>
                  {f.file_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {f.uploaded_by_name ? `${f.uploaded_by_name} · ` : ""}
                  {formatDateTime(f.created_at)}
                  {f.description ? ` · ${f.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  onClick={() => openFile(f.file_url)}
                >
                  <ExternalLink size={15} />
                  {t("billing.contracts_file_open")}
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <a href={f.file_url} download={f.file_name} target="_blank" rel="noopener noreferrer">
                    <Download size={15} />
                    {t("billing.contracts_file_download")}
                  </a>
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("billing.contracts_file_delete")}
                    title={t("billing.contracts_file_delete")}
                    className="size-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => setToDelete(f)}
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {isFetching && !isLoading && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="animate-spin" /> {t("billing.loading")}
        </p>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800 dark:text-slate-100">
              {t("billing.contracts_file_delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              {t("billing.contracts_file_delete_desc", { name: toDelete?.file_name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              {t("billing.contracts_back")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t("billing.contracts_file_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ContractFilesList;
