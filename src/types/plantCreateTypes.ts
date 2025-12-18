// PlantCreate uchun form types

export interface EmptyColumn {
  id: string;
  title: string;
  fullParentChain: string;
}

export interface FormGroup {
  step: number;
  forms: { values: Record<string, string>; plantId: string }[];
}

export interface PlanItem {
  columnId: string;
  plan_value: string;
  fullParentChain: string;
}

export interface PlantFormState {
  formGroups: FormGroup[];
  selectedDeadlineId: string;
  selectedOrganizationId: string;
  allEmptyColumnsByStep: EmptyColumn[][];
  currentStep: number;
  formErrors: string[];
  planItems: PlanItem[];
  usedPlantIds: Set<string>;
  plantsPage: number;
  deadlinePage: number;
}

export type PlantFormAction =
  | { type: "SET_FORM_GROUPS"; payload: FormGroup[] }
  | {
      type: "UPDATE_FORM_VALUE";
      payload: {
        stepIndex: number;
        formIndex: number;
        id: string;
        value: string;
      };
    }
  | {
      type: "UPDATE_PLANT_ID";
      payload: { stepIndex: number; formIndex: number; plantId: string };
    }
  | { type: "ADD_FORM"; payload: number }
  | { type: "REMOVE_FORM"; payload: { stepIndex: number; formIndex: number } }
  | { type: "SET_DEADLINE"; payload: string }
  | { type: "SET_ORGANIZATION"; payload: string }
  | { type: "SET_EMPTY_COLUMNS"; payload: EmptyColumn[][] }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "SET_FORM_ERRORS"; payload: string[] }
  | { type: "ADD_FORM_ERROR"; payload: string }
  | { type: "SET_PLAN_ITEMS"; payload: PlanItem[] }
  | { type: "ADD_USED_PLANT_ID"; payload: string }
  | { type: "SET_PLANTS_PAGE"; payload: number }
  | { type: "SET_DEADLINE_PAGE"; payload: number }
  | { type: "RESET_FORM" };
