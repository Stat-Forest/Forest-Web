import { EditContractDialog } from "../ContractForm/EditContractDialog";
import type { ContractDialogKind, ContractDialogTarget } from "../components/contractDialogTypes";
import BoundaryDialog from "./BoundaryDialog";
import CancelDialog from "./CancelDialog";
import FilesDialog from "./FilesDialog";
import HistoryDialog from "./HistoryDialog";
import LocationDialog from "./LocationDialog";
import ReactivateDialog from "./ReactivateDialog";
import TransferDialog from "./TransferDialog";
import UploadFileDialog from "./UploadFileDialog";

interface ContractDialogsProps {
  target: ContractDialogTarget | null;
  canEdit: boolean;
  onClose: () => void;
  /** Muvaffaqiyatli o'zgarishdan keyin (status, ijarachi, fayl, tahrir) — ro'yxat/summalarni yangilash. */
  onChanged?: () => void;
}

/**
 * Shartnoma ustidagi barcha dialoglar bitta joyda. `target` qaysi dialog va qaysi
 * shartnoma uchun ochilganini bildiradi; ContractsPage va ContractDetailPage ishlatadi.
 */
function ContractDialogs({ target, canEdit, onClose, onChanged }: ContractDialogsProps) {
  const is = (kind: ContractDialogKind) => target?.kind === kind;
  const contract = target?.contract ?? null;
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      <EditContractDialog
        open={is("edit")}
        contractId={is("edit") && contract ? contract.id : null}
        onOpenChange={handleOpenChange}
        onSaved={onChanged}
      />
      <CancelDialog open={is("cancel")} contract={contract} onOpenChange={handleOpenChange} onDone={onChanged} />
      <ReactivateDialog open={is("reactivate")} contract={contract} onOpenChange={handleOpenChange} onDone={onChanged} />
      <TransferDialog open={is("transfer")} contract={contract} onOpenChange={handleOpenChange} onDone={onChanged} />
      <UploadFileDialog open={is("upload")} contract={contract} onOpenChange={handleOpenChange} onDone={onChanged} />
      <FilesDialog open={is("files")} contract={contract} canEdit={canEdit} onOpenChange={handleOpenChange} />
      <LocationDialog open={is("location")} contract={contract} onOpenChange={handleOpenChange} />
      <BoundaryDialog open={is("boundary")} contract={contract} onOpenChange={handleOpenChange} />
      <HistoryDialog open={is("history")} contract={contract} onOpenChange={handleOpenChange} />
    </>
  );
}

export default ContractDialogs;
