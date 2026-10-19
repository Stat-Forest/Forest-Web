import {
  useSendEmailMutation,
  useVerifyCodeMutation,
} from "@/services/authApi";
import { useDispatch } from "react-redux";
import { setAccessOnly } from "@/features/authSlice";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { getSimpleCookie, setSimpleCookie } from "@/utils/cookie";
import { ArrowLeft } from "lucide-react";

interface VerifyCodeResponse {
  access: string;
  refresh: string;
}

const CheckCode = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState<string>(""); // null emas, string qilib
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [verifyCode, { isLoading }] = useVerifyCodeMutation();
  const [sendEmail] = useSendEmailMutation();

  useEffect(() => {
    const savedEmail = getSimpleCookie("reset_email");
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
        // Code ni cookie'ga saqlaymiz (1 soat muddat)
        setSimpleCookie("reset_code", code, 1/24);
        // Qisqa muddatli pwd_reset access token — faqat xotirada (audit A5)
        dispatch(setAccessOnly(res.access));
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
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors duration-200 w-[480px] rounded-2xl shadow-xl px-7 pt-[35px] pb-[35px] flex flex-col gap-4 items-center">
      <button
        type="button"
        onClick={() => navigate("/auth/forget-password")}
        className="self-start flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#00BC7D] dark:hover:text-[#00BC7D] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back") || "Orqaga"}
      </button>
      <h2 className="text-[30px] font-bold text-slate-800 dark:text-slate-100">{t("confirmCode")}</h2>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-[13px] text-center">
        {t("sendedCodeFront")} <span className="text-slate-900 dark:text-slate-100 font-semibold">{email}</span>{" "}
        {t("sendedCodeEnd")}
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-[95%] flex flex-col gap-2 mt-[30px]"
      >
        <span className="text-[15px] font-medium ml-2 text-slate-700 dark:text-slate-300">{t("code")}</span>
        <input
          type="text"
          value={code}
          placeholder="XXXXXX"
          maxLength={6}
          minLength={6}
          required
          onInput={(e) => setCode(e.currentTarget.value.replace(/[^0-9]/g, ""))}
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

        <div className="text-slate-500 dark:text-slate-400 text-[13px] font-medium m-auto mt-3">
          {t("didntGetACode")}{" "}
          <button
            type="button"
            onClick={handleResendCode}
            className="text-[#00BC7D] dark:text-[#00BC7D] cursor-pointer font-bold hover:underline"
          >
            {t("resend")}
          </button>
        </div>

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

export default CheckCode;
