import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/features/authSlice";
import { RootState } from "@/app/store";

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    // Token mavjudligini tekshirish
    if (!token || !user?.access) {
      dispatch(logout());
    }
  }, [token, user, dispatch]);

  return <>{children}</>;
};

export default AppWrapper;
