import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { base_url, prepareHeaders } from "./baseUrl";
import { logout, setToken } from "@/features/authSlice";

interface RefreshResponse {
  access: string;
}

type RefreshOutcome = { ok: true; access: string } | { ok: false; status?: number | string };

// Bir vaqtda kelgan bir nechta 401 bitta refresh so'rovini kutadi.
// Aks holda ikkinchi so'rov allaqachon blacklist qilingan refresh token
// bilan boradi va foydalanuvchi tizimdan chiqarib yuboriladi.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

interface User {
  email: string;
  user_id: string;
  role: string;
}

/**
 * Access tokenni HttpOnly refresh cookie orqali yangilaydi (audit A5).
 * Refresh token JS'da yo'q — brauzer cookie'ni /api/v1/authentications/
 * yo'liga o'zi qo'shib yuboradi (credentials: "include").
 * Bir vaqtda bitta so'rov: AppWrapper intervali va 401 qayta urinishi
 * bir-birini kutadi (ROTATE_REFRESH_TOKENS — ikkita parallel refresh
 * ikkinchisini blacklist'ga uchratardi).
 */
export const refreshAccessToken = (api: { getState: () => unknown; dispatch: (action: any) => unknown }): Promise<RefreshOutcome> => {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshOutcome> => {
      const refreshBaseQuery = fetchBaseQuery({
        baseUrl: `${base_url}/authentications`,
        prepareHeaders,
        credentials: "include",
      });
      const refreshResult = await refreshBaseQuery(
        { url: "/token/refresh/", method: "POST", body: {} },
        api as any,
        {}
      );
      if (!refreshResult.data) {
        return { ok: false, status: (refreshResult.error as FetchBaseQueryError | undefined)?.status };
      }
      const newAccess = (refreshResult.data as RefreshResponse).access;
      const state = api.getState() as any;
      const user = state?.auth?.user as User | null;
      if (user) {
        api.dispatch(setToken({ token: newAccess, user: user as any }));
      }
      return { ok: true, access: newAccess };
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const goToAuth = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/auth";
  }
};

// Base query factory that creates a baseQuery with reauth for a specific baseUrl
export function createBaseQueryWithReauth(
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({ baseUrl, prepareHeaders });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
      const state = api.getState() as any;
      const user = state?.auth?.user as User | null;

      if (user) {
        try {
          const outcome = await refreshAccessToken(api);
          if (outcome.ok) {
            result = await rawBaseQuery(args, api, extraOptions);
          } else {
            api.dispatch(logout());
            goToAuth();
          }
        } catch {
          api.dispatch(logout());
          goToAuth();
        }
      } else {
        // Public sahifalarda (/ , /landing, /auth) redirect qilmaslik
        const isPublicPage =
          typeof window !== "undefined" &&
          (window.location.pathname === "/" || window.location.pathname === "/landing" || window.location.pathname === "/auth");
        if (!isPublicPage) {
          api.dispatch(logout());
          goToAuth();
        }
      }
    }

    return result;
  };
}

export const baseQueryWithReauth = createBaseQueryWithReauth(base_url);
