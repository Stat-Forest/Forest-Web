import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { encryptData } from "@/utils/crypto";
import { logout, setToken } from "@/features/authSlice";
import { RootState } from "@/app/store";
import { useRefreshTokenMutation } from "@/services/authApi";
import { migrateLocalStorageToCookies } from "@/utils/migration";
import SelectionVoiceButton from "@/components/common/SelectionVoiceButton";

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

  useEffect(() => {
    if (!user?.refresh) return;

    // Token refresh interval - har 14 daqiqada (access token odatda 15 daqiqada expire bo'ladi)
    const interval = setInterval(async () => {
      try {
        const res = await refreshToken({ refresh: user.refresh }).unwrap();

        if (res?.access) {
          const newAccess = res.access;
          // ROTATE_REFRESH_TOKENS: yangi refresh ham saqlanadi, aks holda
          // keyingi refresh blacklist'dagi eski token bilan ketib logout bo'lardi
          const updatedUser = { ...user, access: newAccess, refresh: res.refresh ?? user.refresh };
          
          // Xavfsiz cookie'ga saqlaymiz (30 kun muddat)
          encryptData("token", newAccess, "token", 30);
          encryptData("user", updatedUser, "user", 30);
          
          // Update Redux state. Token yangilangani ma'lumotlarni o'zgartirmaydi —
          // ilgari shu yerda barcha so'rovlar qayta yuborilardi (2000 qatorlisi ham).
          dispatch(setToken({ token: newAccess, user: updatedUser }));
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
      {children}
      <SelectionVoiceButton />
    </>
  );
};

export default AppWrapper;
