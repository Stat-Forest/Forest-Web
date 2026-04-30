import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { base_url, prepareHeaders } from "./baseUrl";
import { encryptData } from "@/utils/crypto";
import { logout } from "@/features/authSlice";

interface RefreshResponse {
  access: string;
}

// User interface - circular dependency'ni oldini olish uchun
interface User {
  email: string;
  user_id: string;
  role: string;
  access: string;
  refresh: string;
}

// Base query factory that creates a baseQuery with reauth for a specific baseUrl
// Function declaration - hoisting uchun, circular dependency'ni oldini olish
export function createBaseQueryWithReauth(
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  // Raw base query without reauth for the specific baseUrl
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders,
  });

  // Base query with automatic token refresh on 401
  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    // If we get a 401, try to refresh the token
    if (result.error && result.error.status === 401) {
      // Redux state dan o'qiymiz — cookie ga bog'liq emas
      const state = api.getState() as any;
      const user = state?.auth?.user as User | null;
      const refreshToken = user?.refresh;

      if (refreshToken) {
        try {
          // Create a separate baseQuery for refresh endpoint
          const refreshBaseQuery = fetchBaseQuery({
            baseUrl: `${base_url}/authentications`,
            prepareHeaders,
          });

          // Try to refresh the token
          const refreshResult = await refreshBaseQuery(
            {
              url: "/token/refresh/",
              method: "POST",
              body: { refresh: refreshToken },
            },
            api,
            extraOptions
          );

          // Refresh token response'ni tekshirish
          if (refreshResult.data) {
            const newAccess = (refreshResult.data as RefreshResponse).access;

            // Update stored tokens in secure cookies (30 kun muddat)
            const updatedUser: User = { ...(user as User), access: newAccess };
            encryptData("token", newAccess, "token", 30);
            encryptData("user", updatedUser, "user", 30);

            // Update Redux state
            api.dispatch({
              type: "auth/setToken",
              payload: { token: newAccess, user: updatedUser },
            });

            // Token yangilangandan keyin barcha tag'larni invalidate qilish uchun
            // event yuboramiz (AppWrapper'da qabul qilinadi)
            window.dispatchEvent(new CustomEvent("tokenRefreshed"));

            // Retry the original request with new token
            result = await rawBaseQuery(args, api, extraOptions);
          } else if (refreshResult.error) {
            const refreshError = refreshResult.error as FetchBaseQueryError;
            if (refreshError.status === 401) {
              api.dispatch(logout());
              if (typeof window !== "undefined") {
                window.location.href = "/auth";
              }
            } else {
              api.dispatch(logout());
            }
          } else {
            api.dispatch(logout());
            if (typeof window !== "undefined") {
              window.location.href = "/auth";
            }
          }
        } catch (error) {
          api.dispatch(logout());
          if (typeof window !== "undefined") {
            window.location.href = "/auth";
          }
        }
      } else {
        // No refresh token — public sahifalarda (/ , /landing) redirect qilmaslik
        const isPublicPage =
          typeof window !== "undefined" &&
          (window.location.pathname === "/" || window.location.pathname === "/landing" || window.location.pathname === "/auth");
        if (!isPublicPage) {
          api.dispatch(logout());
          if (typeof window !== "undefined") {
            window.location.href = "/auth";
          }
        }
      }
    }

    return result;
  };
}

// Default baseQueryWithReauth using base_url
export const baseQueryWithReauth = createBaseQueryWithReauth(base_url);

