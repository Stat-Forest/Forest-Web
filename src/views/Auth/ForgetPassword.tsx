import { useSendEmailMutation } from "@/services/authApi";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ForgetPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sendEmail, { isLoading }] = useSendEmailMutation();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        setError(null);
        e.preventDefault();

        sendEmail({ email })
            .unwrap()
            .then(() => {
                // ✅ Emailni sessionStorage'ga yozamiz
                sessionStorage.setItem("reset_email", email);
                navigate("/auth/check-code");
            })
            .catch((err) => {
                setError(err.data?.[0] || "Xatolik yuz berdi");
                console.error(err);
            });
    };

    return (
        <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 pt-[70px] pb-[40px] flex flex-col gap-4 items-center">
            <h2 className="text-[30px] font-bold">Parolingiz esdan chiqdimi?</h2>
            <p className="text-[#929292] font-medium text-[13px]">
                Xavotir olmang, biz qayta tiklash ko'rsatmalarini yuboramiz
            </p>
            <form onSubmit={handleSubmit} className="w-[95%] flex flex-col gap-2 mt-[50px]">
                <span className="text-[15px] font-medium ml-2">
                    Elektron pochta manzili
                </span>
                <input onChange={(e) => setEmail(e.target.value)} value={email} type="email" required className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]" />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <button disabled={isLoading} type="submit" className="mt-[30px] cursor-pointer bg-[#09B86F] rounded-[15px] w-full py-4 text-white font-bold text-[15px]" >
                    {isLoading ? "Yuborilmoqda..." : "YUBORISH"}
                </button>
                <Link replace to={"/auth"} className="text-[#6C6C6C] text-[13px] font-medium m-auto" >
                    Kirishga qaytish
                </Link>
            </form>
        </div>
    );
};

export default ForgetPassword;