import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Credentials, EimzoKey } from "@/types/auth";

declare global {
  interface Window {
    EIMZOClient: any;
    dates: any;
  }
}

function Login() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [eimzoKeys, setEimzoKeys] = useState<EimzoKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // -------- E-IMZO START ---------------
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

    window.EIMZOClient.API_KEYS = [
      "localhost",
      "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
      "127.0.0.1",
      "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
      "null",
      "E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D",
      "ruxsatnoma-urmon.uz",
      "57081C44AC4FD8FA104A4A4E359524F6632FB589618B4C9A380D176CEC4789407135BE5C4417898FA172596031A95562B4B021C67BFE53D4FB1B53B811E6DF17",
    ];

    window.EIMZOClient.checkVersion(
      (major: number, minor: number) => {
        const required = 3 * 100 + 37;
        const current = major * 100 + minor;

        if (current < required) {
          setError(t("eimzoError1"));
          setIsLoading(false);
        } else {
          installApiKeys();
        }
      },
      (r: any) => {
        setError(r || t("eimzoError2"));
        setIsLoading(false);
      }
    );
  };

  const installApiKeys = () => {
    window.EIMZOClient.installApiKeys(
      () => loadEimzoKeys(),
      (r: any) => {
        setError(r || t("eimzoError3"));
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
          label: expired ? `${v.CN} ${t("expired")}` : v.CN,
          disabled: expired,
          vo: v,
        };
      },
      (items: EimzoKey[], firstId: string) => {
        setEimzoKeys(items);
        if (items.length > 0) setSelectedKey(firstId);
        else setError(t("notFoundEImzo"));
        setIsLoading(false);
      },
      (r: any) => {
        setError(r || t("cannotFindKeys"));
        setIsLoading(false);
      }
    );
  };

  const handleEimzoLogin = async () => {
    if (!selectedKey) return setError(t("selectCertificate"));

    const selectedItem = eimzoKeys.find((item) => item.id === selectedKey);
    if (!selectedItem) return setError(t("invalidSelectedCertificate"));

    setIsLoading(true);
    setError(null);

    try {
      const keyId = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.loadKey(
          selectedItem.vo,
          (id: string) => resolve(id),
          (r: any) => {
            const msg = r?.includes("BadPaddingException")
              ? t("inCorrectPass")
              : r || t("cannotFindKeys");
            reject(msg);
          }
        );
      });

      const pkcs7 = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.createPkcs7(
          keyId,
          t("confirmation"),
          null,
          (signature: string) => resolve(signature),
          (r: any) => {
            const msg = r?.includes("BadPaddingException")
              ? t("inCorrectPass")
              : r || t("cannotCreateSignature");
            reject(msg);
          }
        );
      });

      const response = await dispatch(
        authApi.endpoints.eimzoLogin.initiate({
          pkcs7,
          vo: selectedItem.vo,
        })
      ).unwrap();

      if (response?.access) navigate("/main");
      else throw new Error("Token olinmadi");
    } catch (err: any) {
      setError(err?.message || err || t("eImzoErr"));
    } finally {
      setIsLoading(false);
    }
  };

  // -------- LOGIN BY EMAIL/PASSWORD --------------
  const checkAuthHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Email yoki parol bo'sh bo'lishi mumkin emas!");
      return;
    }

    const credentials: Credentials = { email, password };

    try {
      await dispatch(authApi.endpoints.login.initiate(credentials)).unwrap();
      navigate("/main");
    } catch (error: any) {
      console.error("Login failed:", error);

      let msg =
        error?.data ||
        error?.data?.detail ||
        error?.data?.errors ||
        error?.data?.message ||
        "Авторизация не удалась.";

      if (Array.isArray(msg)) msg = msg.join(", ");
      if (typeof msg === "object") msg = Object.values(msg).join(", ");

      setError(msg);
    }
  };

  return (
    <>
      <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
        <h2 className="text-[30px] font-bold">{t("loginTitle")}</h2>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="w-full gap-3">
            <TabsTrigger value="eimzo" className="flex-1">
              {t("eImzoLogin")}
            </TabsTrigger>
            <TabsTrigger value="login" className="flex-1">
              {t("login")}
            </TabsTrigger>
          </TabsList>

          {/* ------------ EIMZO LOGIN ------------- */}
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
                  <option value="" disabled>
                    Sertifikatni tanlang
                  </option>
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
              <p>{t("notFoundSertificate")}</p>
            )}

            {error && <p className="text-red-600">{error}</p>}
          </TabsContent>

          {/* ------------ SIMPLE LOGIN ------------- */}
          <TabsContent value="login" className="pt-6">
            <form onSubmit={checkAuthHandler} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">{t("password")}</Label>

                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3l18 18M10.5 10.5a2.5 2.5 0 113.5 3.5M21 12c-1.5 4.5-6 7.5-9 7.5a9.3 9.3 0 01-4-.9"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                        />
                        <path
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/auth/forget-password"
                    className="text-[#09B86F] text-[15px] font-medium"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="bg-green-600 text-white h-[45px]"
              >
                {t("enter")}
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
