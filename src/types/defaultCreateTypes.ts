// DefaultCreate uchun formula turlari

export interface EmptyColumn {
  id: string;
  title: string;
  fullParentChain: string;
}

export interface DefaultCreateFormState {
  formValues: Record<string, string[]>;
  selectedDeadlineId: string;
  selectedOrganizationId: string;
  allEmptyColumnsByStep: EmptyColumn[][];
  currentStep: number;
}

export type DefaultCreateFormAction =
  | { type: "SET_FORM_VALUES"; payload: Record<string, string[]> }
  | { type: "UPDATE_FORM_VALUE"; payload: { columnId: string; inputIndex: number; value: string } }
  | { type: "ADD_INPUT"; payload: string }
  | { type: "REMOVE_INPUT"; payload: { columnId: string; inputIndex: number } }
  | { type: "SET_DEADLINE"; payload: string }
  | { type: "SET_ORGANIZATION"; payload: string }
  | { type: "SET_EMPTY_COLUMNS"; payload: EmptyColumn[][] }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "RESET_FORM" };

