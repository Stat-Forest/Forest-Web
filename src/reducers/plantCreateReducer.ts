import { PlantFormState, PlantFormAction } from "@/types/plantCreateTypes";

export const plantCreateInitialState: PlantFormState = {
  formGroups: [],
  selectedDeadlineId: "",
  selectedOrganizationId: "",
  allEmptyColumnsByStep: [],
  currentStep: 0,
  formErrors: [],
  planItems: [],
  usedPlantIds: new Set(),
  plantsPage: 1,
  deadlinePage: 1,
};

export function plantCreateReducer(
  state: PlantFormState,
  action: PlantFormAction
): PlantFormState {
  switch (action.type) {
    case "SET_FORM_GROUPS":
      return { ...state, formGroups: action.payload };
    case "UPDATE_FORM_VALUE": {
      const { stepIndex, formIndex, id, value } = action.payload;
      return {
        ...state,
        formGroups: state.formGroups.map((group) =>
          group.step === stepIndex
            ? {
                ...group,
                forms: group.forms.map((form, idx) =>
                  idx === formIndex
                    ? { ...form, values: { ...form.values, [id]: value } }
                    : form
                ),
              }
            : group
        ),
      };
    }
    case "UPDATE_PLANT_ID": {
      const { stepIndex, formIndex, plantId } = action.payload;
      const newUsedPlantIds = new Set(state.usedPlantIds);
      if (plantId) {
        newUsedPlantIds.add(plantId);
      }
      return {
        ...state,
        formGroups: state.formGroups.map((group) =>
          group.step === stepIndex
            ? {
                ...group,
                forms: group.forms.map((form, idx) =>
                  idx === formIndex ? { ...form, plantId } : form
                ),
              }
            : group
        ),
        usedPlantIds: newUsedPlantIds,
      };
    }
    case "ADD_FORM": {
      return {
        ...state,
        formGroups: state.formGroups.map((group) =>
          group.step === action.payload
            ? { ...group, forms: [...group.forms, { values: {}, plantId: "" }] }
            : group
        ),
      };
    }
    case "REMOVE_FORM": {
      const { stepIndex, formIndex } = action.payload;
      return {
        ...state,
        formGroups: state.formGroups.map((group) =>
          group.step === stepIndex
            ? {
                ...group,
                forms: group.forms.filter((_, idx) => idx !== formIndex),
              }
            : group
        ),
      };
    }
    case "SET_DEADLINE":
      return { ...state, selectedDeadlineId: action.payload };
    case "SET_ORGANIZATION":
      return { ...state, selectedOrganizationId: action.payload };
    case "SET_EMPTY_COLUMNS":
      return { ...state, allEmptyColumnsByStep: action.payload, currentStep: 0 };
    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload };
    case "SET_FORM_ERRORS":
      return { ...state, formErrors: action.payload };
    case "ADD_FORM_ERROR":
      return { ...state, formErrors: [...state.formErrors, action.payload] };
    case "SET_PLAN_ITEMS":
      return { ...state, planItems: action.payload };
    case "ADD_USED_PLANT_ID": {
      const newUsed = new Set(state.usedPlantIds);
      newUsed.add(action.payload);
      return { ...state, usedPlantIds: newUsed };
    }
    case "SET_PLANTS_PAGE":
      return { ...state, plantsPage: action.payload };
    case "SET_DEADLINE_PAGE":
      return { ...state, deadlinePage: action.payload };
    case "RESET_FORM":
      return plantCreateInitialState;
    default:
      return state;
  }
}

