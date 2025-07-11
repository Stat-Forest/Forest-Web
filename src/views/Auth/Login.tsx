// ✅ Login.tsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { useState } from "react";
// import key_icon_default from "../../assets/key_icon_default.svg";
// import user_icon_active from "../../assets/user_icon_active.svg";

// interface Credentials {
//   email: string;
//   password: string;
// }

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
      setError("Email yoki parol bo‘sh bo‘lmasligi kerak");
      return;
    }

    try {
      const response = await dispatch(
        authApi.endpoints.login.initiate({ email, password })
      ).unwrap();
      localStorage.setItem("token", response.token);
      navigate("/");
    } catch {
      setError("Oddiy login muvaffaqiyatsiz.");
    }
  };

  const handleEimzoLogin = async () => {
    setError(null);
    const originalText = `login-${new Date().toISOString()}`;
    const ws = new WebSocket("ws://127.0.0.1:64443/");


    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "getKeys", params: [] }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError("E-IMZO xatosi: " + data.error.message);
        return;
      }

      if (data.id === 1 && data.result.length > 0) {
        const cert = data.result[0];

        // ✳️ Sign text
        ws.send(JSON.stringify({
          id: 2,
          method: "sign",
          params: [cert.id, btoa(originalText)],
        }));

        ws.onmessage = async (signEvent) => {
          const signRes = JSON.parse(signEvent.data);
          if (signRes.result) {
            try {
              const res = await dispatch(
                authApi.endpoints.eimzoLogin.initiate({
                  signed: signRes.result,
                  originalText,
                  certInfo: cert,
                })
              ).unwrap();
              localStorage.setItem("token", res.token);
              navigate("/");
            } catch (err) {
              setError("E-IMZO login muvaffaqiyatsiz.");
            }
          }
        };
      } else {
        setError("Kalit topilmadi. Iltimos, E-IMZO ochiq ekanini tekshiring.");
      }
    };

    ws.onerror = () => {
      setError("E-IMZO serverga ulanishda muammo.");
    };
  };

  return (
    <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
      <h2 className="text-[30px] font-bold">Tizimga kirish</h2>
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="w-full gap-3">
          <TabsTrigger value="with_key" className="flex-1">Kalit orqali</TabsTrigger>
          <TabsTrigger value="login" className="flex-1">Login orqali</TabsTrigger>
        </TabsList>

        <TabsContent value="with_key" className="pt-6 flex flex-col gap-4">
          <Button onClick={handleEimzoLogin} className="bg-green-600 text-white h-[45px]">
            E-IMZO bilan kirish
          </Button>
          {error && <p className="text-red-600">{error}</p>}
        </TabsContent>

        <TabsContent value="login" className="pt-6">
          <form onSubmit={checkAuthHandler} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Parol</Label>
              <Input id="password" name="password" type="password" placeholder="********" />
            </div>
            <Button type="submit" className="bg-green-600 text-white h-[45px]">
              Kirish
            </Button>
            {error && <p className="text-red-600">{error}</p>}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Login;
