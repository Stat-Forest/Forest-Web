import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Loader2, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTRACT_FILE_ACCEPT, CONTRACT_FILE_MAX_MB } from "@/features/billing/constants";
import { useUploadContractFileMutation } from "@/services/billingApi";
import { getApiErrorMessage } from "@/utils/downloadFile";
import type { UUID } from "@/features/billing/types";

interface ContractFileUploadFieldsProps {
  contractId: UUID;
  onUploaded?: () => void;
  /** Dialog ichida: Yuklash tugmasi yonida "Ortga" ko'rsatish uchun. */
  extraActions?: ReactNode;
  autoFocus?: boolean;
}

/**
 * Fayl tanlash (yashirin input, accept = CONTRACT_FILE_ACCEPT, ≤ CONTRACT_FILE_MAX_MB) +
 * ixtiyoriy izoh + "Yuklash". FilesDialog, UploadFileDialog va detail sahifada ishlatiladi.
 */
function ContractFileUploadFields({ contractId, onUploaded, extraActions, autoFocus }: ContractFileUploadFieldsProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [upload, { isLoading }] = useUploadContractFileMutation();

  const pick = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > CONTRACT_FILE_MAX_MB * 1024 * 1024) {
      toast.error(t("billing.contracts_upload_too_large", { mb: CONTRACT_FILE_MAX_MB }));
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) {
      toast.warning(t("billing.contracts_upload_no_file"));
      return;
    }
    try {
      await upload({ contract: contractId, file, description: description.trim() || undefined }).unwrap();
      toast.success(t("billing.contracts_upload_success"));
      setFile(null);
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_upload_error")));
    }
  };

  const fieldClass = "h-10 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm";

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={CONTRACT_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("billing.contracts_upload_choose")}
        </Label>
        <button
          type="button"
          autoFocus={autoFocus}
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-left transition-colors cursor-pointer"
        >
          <Paperclip size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
              {file ? file.name : t("billing.contracts_upload_choose")}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                : t("billing.contracts_upload_hint", { mb: CONTRACT_FILE_MAX_MB })}
            </span>
          </span>
        </button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("billing.contracts_upload_description")}
        </Label>
        <Input
          className={fieldClass}
          value={description}
          maxLength={255}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("billing.contracts_upload_description_ph")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={isLoading || !file}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {t("billing.contracts_upload_submit")}
        </Button>
        {extraActions}
      </div>
    </div>
  );
}

export default ContractFileUploadFields;
