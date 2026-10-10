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
  // Backend ROTATE_REFRESH_TOKENS=True: har refresh'da yangi refresh token
  // qaytaradi, eskisi esa blacklist'ga tushadi.
  refresh?: string;
}

type RefreshOutcome =
  | { ok: true; access: string; refresh: string }
  | { ok: false; status?: number | string };

// Bir vaqtda kelgan bir nechta 401 bitta refresh so'rovini kutadi.
// Aks holda ikkinchi so'rov allaqachon blacklist qilingan refresh token
// bilan boradi va foydalanuvchi tizimdan chiqarib yuboriladi.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

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
          if (!refreshInFlight) {
            refreshInFlight = (async (): Promise<RefreshOutcome> => {
              // Create a separate baseQuery for refresh endpoint
              const refreshBaseQuery = fetchBaseQuery({
                baseUrl: `${base_url}/authentications`,
                prepareHeaders,
              });

              const refreshResult = await refreshBaseQuery(
                {
                  url: "/token/refresh/",
                  method: "POST",
                  body: { refresh: refreshToken },
                },
                api,
                extraOptions
              );

              if (!refreshResult.data) {
                return {
                  ok: false,
                  status: (refreshResult.error as FetchBaseQueryError | undefined)?.status,
                };
              }

              const data = refreshResult.data as RefreshResponse;
              const newAccess = data.access;
              const newRefresh = data.refresh ?? refreshToken;

              // Update stored tokens in secure cookies (30 kun muddat)
              const updatedUser: User = {
                ...(user as User),
                access: newAccess,
                refresh: newRefresh,
              };
              encryptData("token", newAccess, "token", 30);
              encryptData("user", updatedUser, "user", 30);

              // Update Redux state
              api.dispatch({
                type: "auth/setToken",
                payload: { token: newAccess, user: updatedUser },
              });

              return { ok: true, access: newAccess, refresh: newRefresh };
            })().finally(() => {
              refreshInFlight = null;
            });
          }

          const outcome = await refreshInFlight;

          if (outcome.ok) {
            // Retry the original request with new token
            result = await rawBaseQuery(args, api, extraOptions);
          } else if (outcome.status !== undefined) {
            if (outcome.status === 401) {
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

