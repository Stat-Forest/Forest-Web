import { DefaultCreateFormState, DefaultCreateFormAction } from "@/types/defaultCreateTypes";

export const defaultCreateInitialState: DefaultCreateFormState = {
  formValues: {},
  selectedDeadlineId: "",
  selectedOrganizationId: "",
  allEmptyColumnsByStep: [],
  currentStep: 0,
};

export function defaultCreateReducer(
  state: DefaultCreateFormState,
  action: DefaultCreateFormAction
): DefaultCreateFormState {
  switch (action.type) {
    case "SET_FORM_VALUES":
      return { ...state, formValues: action.payload };
    case "UPDATE_FORM_VALUE": {
      const { columnId, inputIndex, value } = action.payload;
      const currentValues = state.formValues[columnId] || [""];
      const newValues = [...currentValues];
      newValues[inputIndex] = value;
      return { ...state, formValues: { ...state.formValues, [columnId]: newValues } };
    }
    case "ADD_INPUT": {
      const currentValues = state.formValues[action.payload] || [""];
      return {
        ...state,
        formValues: { ...state.formValues, [action.payload]: [...currentValues, ""] },
      };
    }
    case "REMOVE_INPUT": {
      const { columnId, inputIndex } = action.payload;
      const currentValues = state.formValues[columnId] || [""];
      if (currentValues.length <= 1) return state;
      const newValues = currentValues.filter((_, index) => index !== inputIndex);
      return { ...state, formValues: { ...state.formValues, [columnId]: newValues } };
    }
    case "SET_DEADLINE":
      return { ...state, selectedDeadlineId: action.payload };
    case "SET_ORGANIZATION":
      return { ...state, selectedOrganizationId: action.payload };
    case "SET_EMPTY_COLUMNS":
      return { ...state, allEmptyColumnsByStep: action.payload, currentStep: 0 };
    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload };
    case "RESET_FORM":
      return defaultCreateInitialState;
    default:
      return state;
  }
}

