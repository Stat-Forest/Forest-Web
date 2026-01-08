import { useSetNewPasswordMutation } from "@/services/authApi";
import { decryptData, removeEncryptedData } from "@/utils/crypto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { getSimpleCookie, removeCookie } from "@/utils/cookie";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const token = decryptData("token", "token");
    if (!token) {
      navigate("/auth");
    }
  }, [navigate]);

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
      const code = getSimpleCookie("reset_code") || "";

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
      removeCookie("reset_code");
      removeEncryptedData("token");
      removeEncryptedData("refresh");

      navigate("/auth", { replace: true });
    } catch (err: any) {
      const msg = err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    }
  };

  return (
    <div className="bg-ice w-[480px] rounded-2xl shadow-md px-7 pt-[70px] pb-[40px] flex flex-col gap-4 items-center">
      <h2 className="text-[30px] font-bold">{t("resetPassword")}</h2>
      <form
        onSubmit={handleSubmit}
        className="w-[95%] flex flex-col gap-2 mt-[50px]"
      >
        <span className="text-[15px] font-medium ml-2">
          {t("enterNewPassword")}
        </span>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          required
          className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]"
        />
        <span className="text-[15px] font-medium ml-2 mt-4">
          {t("confirmNewPassword")}
        </span>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          required
          className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]"
        />
        {error && <span className="text-red-500 text-sm">{error}</span>}
        <button
          disabled={isLoading}
          type="submit"
          className="mt-[30px] cursor-pointer bg-[#3B82F6] rounded-[15px] w-full py-4 text-white font-bold text-[15px] hover:bg-[#2563EB]"
        >
          {isLoading ? t("confirming") : t("confirm")}
        </button>
        <Link
          replace
          to={"/auth"}
          className="text-[#6C6C6C] text-[13px] font-medium m-auto"
        >
          {t("backToLogin")}
        </Link>
      </form>
    </div>
  );
};

export default ChangePassword;
