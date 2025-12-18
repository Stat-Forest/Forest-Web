import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { encryptData } from "@/utils/crypto";
import { logout, setToken } from "@/features/authSlice";
import { RootState } from "@/app/store";
import { useRefreshTokenMutation } from "@/services/authApi";
import { migrateLocalStorageToCookies } from "@/utils/migration";
import { reportApi } from "@/services/reportsApi";
import { generalApi } from "@/services/generalApi";
import { statistikApi } from "@/services/statistikApi";
import { sumApi } from "@/services/sumApi";
import SnowAnimation from "./SnowAnimation";

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [refreshToken] = useRefreshTokenMutation();

  // Birinchi marta yuklanganda eski localStorage ma'lumotlarini cookie'ga ko'chiramiz
  // Migration async va defer qilingan - blocking operatsiyalarni oldini olish uchun
  useEffect(() => {
    // Migration'ni defer qilamiz - sahifaning render bo'lishini kechiktirmaydi
    const timeoutId = setTimeout(() => {
      migrateLocalStorageToCookies();
    }, 100); // 100ms keyin ishlatish - sahifa render bo'lgandan keyin

    return () => clearTimeout(timeoutId);
  }, []);

  // Token yangilangandan keyin barcha endpoint'larni yangilash
  useEffect(() => {
    const handleTokenRefreshed = () => {
      // Token yangilangandan keyin barcha tag'larni invalidate qilamiz
      // Bu barcha active query'larni yangilaydi va yangi ma'lumotlarni olib keladi
      dispatch(reportApi.util.invalidateTags(["Reports"]));
      dispatch(generalApi.util.invalidateTags(["Reports"]));
      dispatch(statistikApi.util.invalidateTags(["Reports"]));
      dispatch(sumApi.util.invalidateTags(["Reports"]));
    };

    window.addEventListener("tokenRefreshed", handleTokenRefreshed);
    return () => {
      window.removeEventListener("tokenRefreshed", handleTokenRefreshed);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!user?.refresh) return;

    // Token refresh interval - har 14 daqiqada (access token odatda 15 daqiqada expire bo'ladi)
    const interval = setInterval(async () => {
      try {
        const res = await refreshToken({ refresh: user.refresh }).unwrap();

        if (res?.access) {
          const newAccess = res.access;
          const updatedUser = { ...user, access: newAccess };
          
          // Xavfsiz cookie'ga saqlaymiz (30 kun muddat)
          encryptData("token", newAccess, "token", 30);
          encryptData("user", updatedUser, "user", 30);
          
          // Update Redux state
          dispatch(setToken({ token: newAccess, user: updatedUser }));
          
          // Token yangilangandan keyin barcha endpoint'larni yangilaymiz
          // Bu yangi ma'lumotlarni avtomatik olib keladi
          dispatch(reportApi.util.invalidateTags(["Reports"]));
          dispatch(generalApi.util.invalidateTags(["Reports"]));
          dispatch(statistikApi.util.invalidateTags(["Reports"]));
          dispatch(sumApi.util.invalidateTags(["Reports"]));
        } else {
          dispatch(logout());
        }
      } catch {
        dispatch(logout());
      }
    }, 14 * 60 * 1000); // 14 daqiqa

    return () => clearInterval(interval);
  }, [user, refreshToken, dispatch]);

  return (
    <>
      <SnowAnimation />
      {children}
    </>
  );
};

export default AppWrapper;
