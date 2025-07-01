// features/reportSlice.ts
import { getCookie } from "@/utils/cookie";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface EmptyColumnId {
  id: string;
  title: string;
}

interface ReportState {
  emptyColumns: EmptyColumnId[];
  reportId: string | null; // Qo‘shilgan qism
}

const initialState: ReportState = {
  emptyColumns: [],
  reportId: getCookie("reportId") || null, // Qo‘shilgan qism
};

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    setEmptyColumns: (state, action: PayloadAction<EmptyColumnId[]>) => {
      state.emptyColumns = action.payload;
    },
    clearEmptyColumns: (state) => {
      state.emptyColumns = [];
    },
    setReportId: (state, action: PayloadAction<string>) => {
      state.reportId = action.payload; // Qo‘shilgan reducer
    },
  },
});

export const { setEmptyColumns, clearEmptyColumns, setReportId } =
  reportSlice.actions;
export default reportSlice.reducer;
