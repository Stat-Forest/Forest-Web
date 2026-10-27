import { useSetNewPasswordMutation } from "@/services/authApi";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/features/authSlice";
import { RootState } from "@/app/store";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSimpleCookie, removeCookie } from "@/utils/cookie";
import { ArrowLeft } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  // Tasdiqlash kodi CheckCode'dan navigatsiya holati orqali keladi (cookie emas, audit F6)
  const location = useLocation();
  const resetCode: string = (location.state as { code?: string } | null)?.code ?? "";
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!token) {
      navigate("/auth");
    }
  }, [navigate, token]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [setnewpassword, { isLoading }] = useSetNewPasswordMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError(t("mustFillAll"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("passwordsNotMatch"));
      return;
    }

    try {
      const email = getSimpleCookie("reset_email") || "";
      const code = resetCode;

      await setnewpassword({
        email,
        code,
        password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      alert(t("passwordChangedSuccessfully"));

      setNewPassword("");
      setConfirmPassword("");
      // Cookie'lardan barcha ma'lumotlarni tozalaymiz
      removeCookie("reset_email");
      dispatch(logout());

      navigate("/auth", { replace: true });
    } catch (err: any) {
      const msg = err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors duration-200 w-[480px] rounded-2xl shadow-xl px-7 pt-[35px] pb-[35px] flex flex-col gap-4 items-center">
      <button
        type="button"
        onClick={() => navigate("/auth")}
        className="self-start flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#00BC7D] dark:hover:text-[#00BC7D] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back") || "Orqaga"}
      </button>
      <h2 className="text-[30px] font-bold text-slate-800 dark:text-slate-100">{t("resetPassword")}</h2>
      <form
        onSubmit={handleSubmit}
        className="w-[95%] flex flex-col gap-2 mt-[30px]"
      >
        <span className="text-[15px] font-medium ml-2 text-slate-700 dark:text-slate-300">
          {t("enterNewPassword")}
        </span>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          required
          className="border border-[#DADADA] dark:border-slate-700 rounded-[15px] py-[12px] px-4 bg-[#F8F8F8] dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00BC7D] outline-none"
        />
        <span className="text-[15px] font-medium ml-2 mt-3 text-slate-700 dark:text-slate-300">
          {t("confirmNewPassword")}
        </span>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          required
          className="border border-[#DADADA] dark:border-slate-700 rounded-[15px] py-[12px] px-4 bg-[#F8F8F8] dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00BC7D] outline-none"
        />
        {error && <span className="text-red-500 dark:text-red-400 text-sm">{error}</span>}
        <button
          disabled={isLoading}
          type="submit"
          className="mt-[25px] cursor-pointer bg-[#00BC7D] rounded-[15px] w-full py-4 text-white font-bold text-[15px] hover:bg-[#00a36c] transition-colors"
        >
          {isLoading ? t("confirming") : t("confirm")}
        </button>
        <Link
          replace
          to={"/auth"}
          className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#00BC7D] hover:text-[#00a36c] m-auto mt-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToLogin")}
        </Link>
      </form>
    </div>
  );
};

export default ChangePassword;
