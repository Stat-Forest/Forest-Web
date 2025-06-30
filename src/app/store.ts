import { configureStore } from "@reduxjs/toolkit";
import { reportApi } from "@/services/reportsApi";
import authReducer from "../features/authSlice";
import reportReducer from "../features/reportSlice";
import { authApi } from "@/services/authApi";
import { generalApi } from "@/services/generalApi";
import { statistikApi } from "@/services/statistikApi";

export const store = configureStore({
  reducer: {
    [reportApi.reducerPath]: reportApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [generalApi.reducerPath]: generalApi.reducer,
    [statistikApi.reducerPath]: statistikApi.reducer,

    auth: authReducer,
    report: reportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(
      reportApi.middleware,
      authApi.middleware,
      generalApi.middleware,
      statistikApi.middleware
    ),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
