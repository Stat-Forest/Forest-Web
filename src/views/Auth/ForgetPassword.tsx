import { useSendEmailMutation } from "@/services/authApi";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { setSimpleCookie } from "@/utils/cookie";

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
        <div className="bg-ice w-[480px] rounded-2xl shadow-md px-7 pt-[70px] pb-[40px] flex flex-col gap-4 items-center">
            <h2 className="text-[30px] font-bold">{t("forgotPassword2")}</h2>
            <p className="text-[#929292] font-medium text-[13px]">
                {t("forgotPasswordDesc")}
            </p>
            <form onSubmit={handleSubmit} className="w-[95%] flex flex-col gap-2 mt-[50px]">
                <span className="text-[15px] font-medium ml-2">
                    {t("email")}
                </span>
                <input onChange={(e) => setEmail(e.target.value)} value={email} type="email" required className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]" />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <button disabled={isLoading} type="submit" className="mt-[30px] cursor-pointer bg-[#3B82F6] rounded-[15px] w-full py-4 text-white font-bold text-[15px] hover:bg-[#2563EB]" >
                    {isLoading ? t("sending") : t("send")}
                </button>
                <Link replace to={"/auth"} className="text-[#6C6C6C] text-[13px] font-medium m-auto" >
                    {t("backToLogin")}
                </Link>
            </form>
        </div>
    );
};

export default ForgetPassword;