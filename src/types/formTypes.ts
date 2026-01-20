// CreateReport va UpdatePlans uchun formula turlari

export interface CreateReportFormState {
  selectedOrg: string | null;
  searchTerm: string;
  statement: string | null;
  values: Record<string, string>;
  season: string | null;
  year: number | undefined;
}

export type CreateReportFormAction =
  | { type: "SET_SELECTED_ORG"; payload: string | null }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_STATEMENT"; payload: string | null }
  | { type: "SET_SEASON"; payload: string | null }
  | { type: "SET_VALUE"; payload: { columnId: string; value: string } }
  | { type: "SET_YEAR"; payload: number | undefined }
  | { type: "RESET_FORM" };

export interface UpdatePlansFormState {
  selectedOrg: string | null;
  statement: string | null;
  values: Record<string, string>;
  year: number | undefined;
  searchTerm: string;
  season: string | null;
}

export type UpdatePlansFormAction =
  | { type: "SET_SELECTED_ORG"; payload: string | null }
  | { type: "SET_STATEMENT"; payload: string | null }
  | { type: "SET_VALUE"; payload: { columnId: string; value: string } }
  | { type: "SET_YEAR"; payload: number | undefined }
  | { type: "SET_SEASON"; payload: string | null }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "INIT_FORM"; payload: Partial<UpdatePlansFormState> };
