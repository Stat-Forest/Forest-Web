import { useSendEmailMutation } from "@/services/authApi";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { setSimpleCookie } from "@/utils/cookie";
import { ArrowLeft } from "lucide-react";

const ForgetPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sendEmail, { isLoading }] = useSendEmailMutation();
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation(); 

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        setError(null);
        e.preventDefault();

        sendEmail({ email })
            .unwrap()
            .then(() => {
                // ✅ Emailni cookie'ga yozamiz (1 soat muddat)
                setSimpleCookie("reset_email", email, 1/24); // 1 soat
                navigate("/auth/check-code");
            })
            .catch((err) => {
                setError(err.data?.[0] || "Xatolik yuz berdi");
                console.error(err);
            });
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
            <h2 className="text-[30px] font-bold text-slate-800 dark:text-slate-100">{t("forgotPassword2")}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[13px] text-center">
                {t("forgotPasswordDesc")}
            </p>
            <form onSubmit={handleSubmit} className="w-[95%] flex flex-col gap-2 mt-[30px]">
                <span className="text-[15px] font-medium ml-2 text-slate-700 dark:text-slate-300">
                    {t("email")}
                </span>
                <input onChange={(e) => setEmail(e.target.value)} value={email} type="email" required className="border border-[#DADADA] dark:border-slate-700 rounded-[15px] py-[12px] px-4 bg-[#F8F8F8] dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00BC7D] outline-none" />
                {error && <span className="text-red-500 dark:text-red-400 text-sm">{error}</span>}
                <button disabled={isLoading} type="submit" className="mt-[25px] cursor-pointer bg-[#00BC7D] rounded-[15px] w-full py-4 text-white font-bold text-[15px] hover:bg-[#00a36c] transition-colors" >
                    {isLoading ? t("sending") : t("send")}
                </button>
                <Link replace to={"/auth"} className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#00BC7D] hover:text-[#00a36c] m-auto mt-2 transition-colors" >
                    <ArrowLeft className="w-4 h-4" />
                    {t("backToLogin")}
                </Link>
            </form>
        </div>
    );
};

export default ForgetPassword;