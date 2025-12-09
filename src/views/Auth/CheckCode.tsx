import {
  useSendEmailMutation,
  useVerifyCodeMutation,
} from "@/services/authApi";
import { encryptData } from "@/utils/crypto";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

interface VerifyCodeResponse {
  access: string;
  refresh: string;
}

const CheckCode = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState<string>(""); // null emas, string qilib
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [verifyCode, { isLoading }] = useVerifyCodeMutation();
  const [sendEmail] = useSendEmailMutation();

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("reset_email");
    if (!savedEmail) {
      navigate("/auth/forget-password");
      return;
    }
    setEmail(savedEmail);
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(
        t("emailNotFound") || "Email topilmadi. Qaytadan urinib ko‘ring."
      );
      navigate("/auth/forget-password");
      return;
    }

    verifyCode({ email, code })
      .unwrap()
      .then((res: VerifyCodeResponse) => {
        // Xavfsiz cookie'ga saqlaymiz (30 kun muddat)
        encryptData("token", res.access, "token", 30);
        encryptData("refresh", res.refresh, "refresh", 30);
        navigate("/auth/change-password");
      })
      .catch((err: any) => {
        setError(err?.data?.[0] || t("errorOccurred") || "Xatolik yuz berdi");
        console.error("Tasdiqlash kodi xato:", err);
      });
  };

  const handleResendCode = () => {
    if (!email) return;
    sendEmail({ email })
      .unwrap()
      .catch((err: any) => {
        setError(err?.data?.[0] || t("errorOccurred") || "Xatolik yuz berdi");
        console.error(err);
      });
  };

  return (
    <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
      <h2 className="text-[30px] font-bold">{t("confirmCode")}</h2>
      <p className="text-[#929292] font-medium text-[13px]">
        {t("sendedCodeFront")} <span className="text-black">{email}</span>{" "}
        {t("sendedCodeEnd")}
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-[95%] flex flex-col gap-2 mt-[50px]"
      >
        <span className="text-[15px] font-medium ml-2">{t("code")}</span>
        <input
          type="text"
          value={code}
          placeholder="XXXXXX"
          maxLength={6}
          minLength={6}
          required
          onInput={(e) => setCode(e.currentTarget.value.replace(/[^0-9]/g, ""))}
          className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]"
        />

        {error && <span className="text-red-500 text-sm">{error}</span>}

        <button
          disabled={isLoading}
          type="submit"
          className="mt-[30px] cursor-pointer bg-[#09B86F] rounded-[15px] w-full py-4 text-white font-bold text-[15px]"
        >
          {isLoading ? t("confirming") : t("confirm")}
        </button>

        <div className="text-[#6C6C6C] text-[13px] font-medium m-auto mt-3">
          {t("didntGetACode")}{" "}
          <button
            type="button"
            onClick={handleResendCode}
            className="text-[#09B86F] cursor-pointer"
          >
            {t("resend")}
          </button>
        </div>

        <Link
          replace
          to={"/auth"}
          className="text-[#6C6C6C] text-[13px] font-medium m-auto mt-2"
        >
          {t("backToLogin")}
        </Link>
      </form>
    </div>
  );
};

export default CheckCode;
