import { useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { logout } from "@/features/authSlice";
import { RootState } from "@/app/store";
import { refreshAccessToken } from "@/services/baseQueryWithReauth";
import SelectionVoiceButton from "@/components/common/SelectionVoiceButton";

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const store = useStore();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // Sahifa qayta yuklanganda access token xotirada yo'q (persist qilinmaydi) —
  // HttpOnly refresh cookie orqali yangisini olamiz; cookie yo'q/eskirgan bo'lsa chiqamiz.
  useEffect(() => {
    if (!user || token) return;
    let cancelled = false;
    refreshAccessToken(store)
      .then((outcome) => {
        if (!cancelled && !outcome.ok) dispatch(logout());
      })
      .catch(() => {
        if (!cancelled) dispatch(logout());
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, store, dispatch]);

  // Har 14 daqiqada yangilash (access token 15 daqiqa yashaydi)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshAccessToken(store)
        .then((outcome) => {
          if (!outcome.ok) dispatch(logout());
        })
        .catch(() => dispatch(logout()));
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, store, dispatch]);

  return (
    <>
      {children}
      <SelectionVoiceButton />
    </>
  );
};

export default AppWrapper;
