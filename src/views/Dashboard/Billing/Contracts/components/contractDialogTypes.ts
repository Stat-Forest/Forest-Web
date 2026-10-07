import type { ContractListItem } from "@/features/billing/types";

/** Shartnoma ustidagi amallar — qaysi dialog ochilishi kerakligini bildiradi. */
export type ContractDialogKind =
  | "edit"
  | "cancel"
  | "reactivate"
  | "transfer"
  | "upload"
  | "files"
  | "location"
  | "boundary"
  | "history";

export interface ContractDialogTarget {
  kind: ContractDialogKind;
  contract: ContractListItem;
}

export type OpenContractDialog = (kind: ContractDialogKind, contract: ContractListItem) => void;
