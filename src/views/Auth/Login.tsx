import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import key_icon_default from "../../assets/key_icon_default.svg";
import user_icon_active from "../../assets/user_icon_active.svg";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { useState } from "react";

interface Credentials {
  email: string;
  password: string;
}

function Login() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const checkAuthHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      console.warn("Email yoki parol bo'sh bo'lishi mumkin emas!");
      return;
    }

    const credentials: Credentials = { email, password };
    try {
      await dispatch(authApi.endpoints.login.initiate(credentials)).unwrap();
      navigate("/");
    } catch (error: any) {
      console.error("Login failed", error);
      setError("Авторизация не удалась.");
    }
  };

  return (
    <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex items-center flex-col gap-3.5">
      <h2 className="text-center text-[#000000] text-[34px] font-bold">
        Tizimga kirish
      </h2>
      <span className="text-center w-full text-[#929292] text-[13px]">
        O'rmon xo‘jaligi hisobini yuritish axborot tizimi
      </span>

      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="w-full h-10 gap-3">
          <TabsTrigger className="h-[40px]" value="with_key">
            <div className="flex items-center justify-between w-full px-5">
              <span>Kalit orqali</span>
              <img src={key_icon_default} alt="img" />
            </div>
          </TabsTrigger>
          <TabsTrigger className="h-[40px]" value="login">
            <div className="flex items-center justify-between w-full px-5">
              <span>Login orqali</span>
              <img src={user_icon_active} alt="img" />
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="with_key" className="pt-6">
          <div className="w-full">
            <Label htmlFor="key_email" className="mb-2">
              Elektron pochta manzili
            </Label>
            <Input
              id="key_email"
              name="key_email"
              placeholder="mail@gmail.com"
              className="h-[43px]"
            />
          </div>
        </TabsContent>

        <TabsContent
          className="flex items-center flex-col gap-4 pt-4"
          value="login"
        >
          <form
            onSubmit={checkAuthHandler}
            className="flex items-center flex-col gap-4 w-full"
          >
            <div className="w-full">
              <Label htmlFor="email" className="mb-2">
                Elektron pochta manzili
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="mail@gmail.com"
                className="h-[43px]"
                autoComplete="email"
              />
            </div>
            <div className="w-full">
              <Label htmlFor="password" className="mb-2">
                Maxfiy kod
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                className="h-[43px]"
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-between w-full">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" name="remember" />
                <Label htmlFor="remember" className="text-[#8F8F8F]">
                  Meni eslab qol
                </Label>
              </div>
              <Button
                type="button"
                className="p-0 bg-transparent shadow-none text-[#09B86F] hover:bg-transparent"
              >
                Maxfiy kodni tiklash uchun?
              </Button>
            </div>
            <Button
              type="submit"
              className="w-full h-[45px] text-white bg-[#09B86F] font-bold hover:bg-[#09B86F] hover:text-white"
            >
              KIRISH
            </Button>
            {error && <p className="error-message text-red-600">{error}</p>}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Login;
