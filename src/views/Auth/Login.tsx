import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    EIMZOClient: any;
    dates: any;
  }
}

interface EimzoKey {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
  vo: any;
}

interface Credentials {
  email: string;
  password: string;
}

function Login() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [eimzoKeys, setEimzoKeys] = useState<EimzoKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // E-IMZO klientini ishga tushirish
  useEffect(() => {
    if (window.EIMZOClient) {
      initializeEimzo();
    } else {
      setError("E-IMZO klienti yuklanmadi. Iltimos, sahifani yangilang.");
    }
  }, []);

  const initializeEimzo = () => {
    setIsLoading(true);
    setError(null);

    // E-IMZO API kalitlari
    window.EIMZOClient.API_KEYS = [
      'localhost', '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',
      '127.0.0.1', 'A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F',
      'null', 'E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D',
      'ruxsatnoma-urmon.uz', '57081C44AC4FD8FA104A4A4E359524F6632FB589618B4C9A380D176CEC4789407135BE5C4417898FA172596031A95562B4B021C67BFE53D4FB1B53B811E6DF17'
    ];

    // Versiyani tekshirish
    window.EIMZOClient.checkVersion(
      (major: number, minor: number) => {
        const requiredVersion = 3 * 100 + 37; // 3.37
        const currentVersion = major * 100 + minor;

        if (currentVersion < requiredVersion) {
          setError("Iltimos, E-IMZO dasturini yangilang");
          setIsLoading(false);
        } else {
          installApiKeys();
        }
      },
      (r: any) => {
        if (r) {
          setError(r);
        } else {
          setError("E-IMZO bilan ulanib bo'lmadi");
        }
        setIsLoading(false);
      }
    );
  };

  const installApiKeys = () => {
    window.EIMZOClient.installApiKeys(
      () => loadEimzoKeys(),
      (r: any) => {
        if (r) {
          setError(r);
        } else {
          setError("API kalitlarini o'rnatib bo'lmadi");
        }
        setIsLoading(false);
      }
    );
  };

  const loadEimzoKeys = () => {
    window.EIMZOClient.listAllUserKeys(
      (o: any, i: number) => `itm-${o.serialNumber}-${i}`,
      (itemId: string, v: any) => {
        const now = new Date();
        const validTo = new Date(v.validTo);
        const expired = validTo < now;

        return {
          id: itemId,
          value: itemId,
          label: expired ? `${v.CN} (muddati tugagan)` : v.CN,
          disabled: expired,
          vo: v
        };
      },
      (items: EimzoKey[], firstId: string) => {
        setEimzoKeys(items);
        if (items.length > 0) {
          setSelectedKey(firstId);
        } else {
          setError("E-IMZO kalitlari topilmadi");
        }
        setIsLoading(false);
      },
      (r: any) => {
        if (r) {
          setError(r);
        } else {
          setError("Kalitlarni yuklab bo'lmadi");
        }
        setIsLoading(false);
      }
    );
  };
  const handleEimzoLogin = async () => {
    if (!selectedKey) {
      setError("Iltimos, sertifikatni tanlang");
      return;
    }

    const selectedItem = eimzoKeys.find(item => item.id === selectedKey);
    if (!selectedItem) {
      setError("Noto'g'ri tanlangan sertifikat");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Kalitni yuklash
      const keyId = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.loadKey(
          selectedItem.vo,
          (id: string) => resolve(id),
          (r: any) => {
            const errorMsg = r?.includes("BadPaddingException")
              ? "Noto'g'ri parol"
              : r || "Kalitni yuklab bo'lmadi";
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        );
      });

      // 2. Imzo yaratish
      const pkcs7 = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.createPkcs7(
          keyId,
          "Tasdiqlaymiz",
          null,
          (signature: string) => resolve(signature),
          (r: any) => {
            const errorMsg = r?.includes("BadPaddingException")
              ? "Noto'g'ri parol"
              : r || "Imzo yaratib bo'lmadi";
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        );
      });

      // 3. EIMZO login va token olish
      const response = await dispatch(
        authApi.endpoints.eimzoLogin.initiate({
          pkcs7,
          vo: selectedItem.vo,
        })
      ).unwrap();

      // 4. Muvaffaqiyatli login bo‘lsa, redirect
      if (response?.access) {
        navigate("/main");
      } else {
        throw new Error("Token olinmadi");
      }
    } catch (error: any) {
      console.error("E-IMZO orqali kirish muvaffaqiyatsiz:", error);

      let errorMessage = "E-IMZO orqali kirish muvaffaqiyatsiz. Iltimos, qayta urinib ko'ring.";
      if (typeof error === "object" && "status" in error && error.status === 404) {
        errorMessage = "E-IMZO login endpointi topilmadi. Iltimos, tizim administratoriga murojaat qiling.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };




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
      navigate("/main");
    } catch (error: any) {
      console.error("Login failed", error);
      setError("Авторизация не удалась.");
    }
  };

  return (
    <>
    <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
      <h2 className="text-[30px] font-bold">Tizimga kirish</h2>

      <Tabs defaultValue="login" className="w-full">
        <TabsList className="w-full gap-3">
          <TabsTrigger value="eimzo" className="flex-1">E-IMZO orqali</TabsTrigger>
          <TabsTrigger value="login" className="flex-1">Login orqali</TabsTrigger>
        </TabsList>

        {/* E-IMZO orqali kirish */}
        <TabsContent value="eimzo" className="pt-6 flex flex-col gap-4">
          {isLoading ? (
            <p>Yuklanmoqda...</p>
          ) : eimzoKeys.length > 0 ? (
            <>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="" disabled>Sertifikatni tanlang</option>
                {eimzoKeys.map((key) => (
                  <option
                    key={key.id}
                    value={key.id}
                    disabled={key.disabled}
                    className={key.disabled ? "text-gray-400" : ""}
                  >
                    {key.label}
                  </option>
                ))}
              </select>

              <Button
                onClick={handleEimzoLogin}
                className="bg-green-600 text-white h-[45px]"
                disabled={!selectedKey || isLoading}
              >
                {isLoading ? "Ishlanmoqda..." : "Kirish"}
              </Button>
            </>
          ) : (
            <p>Sertifikatlar topilmadi. E-IMZO dasturini tekshiring.</p>
          )}

          {error && <p className="text-red-600">{error}</p>}
        </TabsContent>

        {/* Oddiy login */}
        <TabsContent value="login" className="pt-6">
          <form onSubmit={checkAuthHandler} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
              />
              <div className="flex justify-end">
            <Link to={"/auth/forget-password"} type="button" onClick={()=>setIsModalOpen(true)} className="text-[#09B86F] text-[15px] font-medium">Забыли пароль?</Link>
              </div>
            </div>
            <Button type="submit" className="bg-green-600 text-white h-[45px]">
              Kirish
            </Button>
            {error && <p className="text-red-600">{error}</p>}
          </form>
        </TabsContent>
      </Tabs>
    </div>
      </>
  );
}

export default Login;