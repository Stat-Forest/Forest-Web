import { CreateReportFormState, CreateReportFormAction, UpdatePlansFormState, UpdatePlansFormAction } from "@/types/formTypes";

// CreateReport uchun reducer
export const createReportInitialState: CreateReportFormState = {
  selectedOrg: null,
  searchTerm: "",
  statement: null,
  values: {},
  year: undefined,
};

export function createReportReducer(
  state: CreateReportFormState,
  action: CreateReportFormAction
): CreateReportFormState {
  switch (action.type) {
    case "SET_SELECTED_ORG":
      return { ...state, selectedOrg: action.payload };
    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload };
    case "SET_STATEMENT":
      return { ...state, statement: action.payload };
    case "SET_VALUE":
      return {
        ...state,
        values: { ...state.values, [action.payload.columnId]: action.payload.value },
      };
    case "SET_YEAR":
      return { ...state, year: action.payload };
    case "RESET_FORM":
      return { ...createReportInitialState, year: 2025 };
    default:
      return state;
  }
}

// UpdatePlans uchun reducer
export const updatePlansInitialState: UpdatePlansFormState = {
  selectedOrg: null,
  statement: null,
  values: {},
  year: undefined,
  searchTerm: "",
};

export function updatePlansReducer(
  state: UpdatePlansFormState,
  action: UpdatePlansFormAction
): UpdatePlansFormState {
  switch (action.type) {
    case "SET_SELECTED_ORG":
      return { ...state, selectedOrg: action.payload };
    case "SET_STATEMENT":
      return { ...state, statement: action.payload };
    case "SET_VALUE":
      return {
        ...state,
        values: { ...state.values, [action.payload.columnId]: action.payload.value },
      };
    case "SET_YEAR":
      return { ...state, year: action.payload };
    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload };
    case "INIT_FORM":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

