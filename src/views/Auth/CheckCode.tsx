import { useSendEmailMutation, useVerifyCodeMutation } from "@/services/authApi";
import { encryptData } from "@/utils/crypto";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const CheckCode = () => {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [email, setEmail] = useState<string | null>(null);
    const [verifyCode, { isLoading }] = useVerifyCodeMutation();
    const [sendEmail] = useSendEmailMutation();

    useEffect(() => {
        const email = sessionStorage.getItem("reset_email");
        if (!email) {
            navigate("/auth/forget-password");
            return
        }
        setEmail(email);
    }, [navigate]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        const email = sessionStorage.getItem("reset_email");

        if (!email) {
            setError("Email topilmadi. Qaytadan urinib ko‘ring.");
            navigate("/auth/forget-password");
            return;
        }
        verifyCode({ email, code }).unwrap()
            .then((res) => {
                console.log(res);
                encryptData("token", res.access, "token");
                       
                navigate("/auth/change-password");
                
            })
            .catch((error) => {
                setError(error.data[0] || "Xatolik yuz berdi");
                console.error("Tasdiqlash kodi xato:", error);
            });
    };

    const handleResendCode = () => {
        const email = sessionStorage.getItem("reset_email");
        sendEmail({ email })
            .unwrap()
            .catch((err) => {
                setError(err.data?.[0] || "Xatolik yuz berdi");
                console.error(err);
            });
    }

    return (
        <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
            <h2 className="text-[30px] font-bold">Kodni tasdiqlang</h2>
            <p className="text-[#929292] font-medium text-[13px]">
                <span className="text-black"> {email}</span> ga kod yubordik
            </p>
            <form onSubmit={handleSubmit} className="w-[95%] flex flex-col gap-2 mt-[50px] ">
                <span className="text-[15px] font-medium ml-2">Kod</span>
                <input type="text" value={code} placeholder="XXXXXX" maxLength={6} minLength={6} required onInput={(e) => setCode(e.currentTarget.value.replace(/[^0-9]/g, ""))} className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]" />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <button disabled={isLoading} type="submit" className="mt-[30px] cursor-pointer bg-[#09B86F] rounded-[15px] w-full py-4 text-white font-bold text-[15px]" >
                    {isLoading ? "Tekshirilmoqda..." : "TASDIQLASH"}
                </button>
                <div className="text-[#6C6C6C] text-[13px] font-medium m-auto mt-3">Kod ni olmadingizmi? <button type="button" onClick={handleResendCode} className="text-[#09B86F] cursor-pointer">Qayta yuborish</button></div>
                <Link replace to={"/auth"} className="text-[#6C6C6C] text-[13px] font-medium m-auto mt-2" >
                    Kirishga qaytish
                </Link>
            </form>
        </div>
    );
};

export default CheckCode;