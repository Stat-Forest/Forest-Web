import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ReportsFilterKey = "sent" | "accepted" | "cancelled";

type ReportFilterState = {
  selectedOrganization: string;
  selectedPeriod: string;
  searchTerm: string;
  selectedStatement: string;
};

type AnnouncementState = {
  open: boolean;
  currentIndex: number;
};

type HeaderUiState = {
  changePasswordOpen: boolean;
  notificationOpen: boolean;
  unreadCount: number;
};

type NewsletterState = {
  page: number;
  selectedStatement: string;
  selectedPeriod: string;
};

type UiState = {
  announcement: AnnouncementState;
  header: HeaderUiState;
  reportsFilters: Record<ReportsFilterKey, ReportFilterState>;
  newsletters: NewsletterState;
};

const emptyReportFilter: ReportFilterState = {
  selectedOrganization: "",
  selectedPeriod: "",
  searchTerm: "",
  selectedStatement: "",
};

const initialState: UiState = {
  announcement: { open: false, currentIndex: 0 },
  header: { changePasswordOpen: false, notificationOpen: false, unreadCount: 0 },
  reportsFilters: {
    sent: { ...emptyReportFilter },
    accepted: { ...emptyReportFilter },
    cancelled: { ...emptyReportFilter },
  },
  newsletters: {
    page: 1,
    selectedStatement: "",
    selectedPeriod: "",
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setAnnouncementState: (
      state,
      action: PayloadAction<Partial<AnnouncementState>>
    ) => {
      state.announcement = { ...state.announcement, ...action.payload };
    },
    resetAnnouncementState: (state) => {
      state.announcement = initialState.announcement;
    },
    setHeaderState: (state, action: PayloadAction<Partial<HeaderUiState>>) => {
      state.header = { ...state.header, ...action.payload };
    },
    resetHeaderState: (state) => {
      state.header = initialState.header;
    },
    setReportsFilter: (
      state,
      action: PayloadAction<{
        key: ReportsFilterKey;
        changes: Partial<ReportFilterState>;
      }>
    ) => {
      const { key, changes } = action.payload;
      state.reportsFilters[key] = {
        ...state.reportsFilters[key],
        ...changes,
      };
    },
    resetReportsFilter: (state, action: PayloadAction<ReportsFilterKey>) => {
      state.reportsFilters[action.payload] = {
        ...initialState.reportsFilters[action.payload],
      };
    },
    setNewsletterState: (
      state,
      action: PayloadAction<Partial<NewsletterState>>
    ) => {
      state.newsletters = { ...state.newsletters, ...action.payload };
    },
    resetNewsletterState: (state) => {
      state.newsletters = initialState.newsletters;
    },
  },
});

export const {
  setAnnouncementState,
  resetAnnouncementState,
  setHeaderState,
  resetHeaderState,
  setReportsFilter,
  resetReportsFilter,
  setNewsletterState,
  resetNewsletterState,
} = uiSlice.actions;

export type { ReportsFilterKey, ReportFilterState, NewsletterState };
export default uiSlice.reducer;

