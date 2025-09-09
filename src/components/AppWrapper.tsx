import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { encryptData } from "@/utils/crypto";
import { logout } from "@/features/authSlice";
import { RootState } from "@/app/store";
import { useRefreshTokenMutation } from "@/services/authApi";

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [refreshToken] = useRefreshTokenMutation();

  useEffect(() => {
    if (!user?.refresh) return;

    const interval = setInterval(async () => {
      try {
        const res = await refreshToken({ refresh: user.refresh }).unwrap();

        if (res?.access) {
          const newAccess = res.access;
          const updatedUser = { ...user, access: newAccess };
          encryptData("token", newAccess, "token");
          encryptData("user", updatedUser, "user");
        } else {
          dispatch(logout());
        }
      } catch {
        dispatch(logout());
      }
    }, 30000); // har 30 sekundda yangilash

    return () => clearInterval(interval);
  }, [user, refreshToken, dispatch]);

  return <>{children}</>;
};

export default AppWrapper;
