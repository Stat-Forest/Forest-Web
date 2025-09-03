import { useChangePasswordMutation, useSetNewPasswordMutation } from '@/services/authApi';
import { decryptData } from '@/utils/crypto';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const token = decryptData("token", "token");

        if (!token) {
            navigate("/auth");
        }

    }, [navigate]);
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState('')
      const [setnewpassword, { isLoading }] = useSetNewPasswordMutation();


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        setError("");

    if (!newPassword || !confirmPassword) {
      setError("Barcha maydonlar to‘ldirilishi shart");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Yangi parollar bir-biriga mos kelmayapti");
      return;
    }

    try {
      await setnewpassword({
        password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      alert("Parol muvaffaqiyatli o‘zgartirildi");

      setNewPassword("");
      setConfirmPassword("");
      navigate("/auth", { replace: true });
      sessionStorage.removeItem("reset_email");
      localStorage.removeItem("token");

    } catch (err: any) {
      const msg = err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    }

    }

    return (
        <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 pt-[70px] pb-[40px] flex flex-col gap-4 items-center">
            <h2 className="text-[30px] font-bold">Parolni tiklash</h2>
            <form onSubmit={handleSubmit} className="w-[95%] flex flex-col gap-2 mt-[50px]">
                <span className="text-[15px] font-medium ml-2"> Yangi parolni kiriting</span>
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]" />
                <span className="text-[15px] font-medium ml-2 mt-4"> Yangi parolni tasdiqlang</span>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required className="border border-[#DADADA] rounded-[15px] py-[12px] px-4 bg-[#F8F8F8]" />
                {error && <span className="text-red-500 text-sm">{error}</span>}
                <button disabled={isLoading} type="submit" className="mt-[30px] cursor-pointer bg-[#09B86F] rounded-[15px] w-full py-4 text-white font-bold text-[15px]" >{isLoading ? "Tasdiqlanmoqda..." : "TASDIQLASH"}</button>
                <Link replace to={"/auth"} className="text-[#6C6C6C] text-[13px] font-medium m-auto" >Kirishga qaytish</Link>
            </form>
        </div>
    )
}

export default ChangePassword
