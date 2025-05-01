import { configureStore } from "@reduxjs/toolkit";
import { reportApi } from "@/services/reportsApi";

export const store = configureStore({
  reducer: {
    [reportApi.reducerPath]: reportApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(reportApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
