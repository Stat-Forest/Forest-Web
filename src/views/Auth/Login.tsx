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
import { getEimzoApiKeys } from "@/utils/eimzoConfig";

declare global {
  interface Window {
    EIMZOClient: any;
    CAPIWS: any;
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
  // 
  // Test muhiti uchun sertifikatlar:
  // - USB-token (ID-card, BAIK-token): https://test.e-imzo.uz/registrator/public/ckc.html
  // - PFX-ключ: https://test.e-imzo.uz/registrator/public/pfx.html
  // ⚠️ Test sertifikatlar faqat test-vpn e-imzo-server da ishlaydi
  //
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

    // E-IMZO API keys ni .env dan o'qib o'rnatamiz
    window.EIMZOClient.API_KEYS = getEimzoApiKeys();

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
      () => findTokensAndLoadKeys(),
      (r: any) => {
        setError(r || t("eimzoError3"));
        setIsLoading(false);
      }
    );
  };

  const handleRefreshKeys = () => {
    setError(null);
    setIsLoading(true);
    // USB-tokenlarni topish uchun avval findTokens ni chaqiramiz
    findTokensAndLoadKeys();
  };

  const findTokensAndLoadKeys = () => {
    // CAPIWS mavjudligini tekshiramiz
    if (window.CAPIWS && window.CAPIWS.findTokens) {
      // Avval USB-tokenlarni topamiz
      window.CAPIWS.findTokens(
        () => {
          // Keyin .pfx fayllarni topamiz
          if (window.CAPIWS.findPfxs) {
            window.CAPIWS.findPfxs(
              () => {
                // Ikkalasini ham topgandan keyin listAllUserKeys ni chaqiramiz
                loadEimzoKeys();
              },
              (err: any) => {
                console.warn("findPfxs error:", err);
                // findPfxs xatolik bersa ham listAllUserKeys ni chaqiramiz
                loadEimzoKeys();
              }
            );
          } else {
            loadEimzoKeys();
          }
        },
        (err: any) => {
          console.warn("findTokens error:", err);
          // findTokens xatolik bersa ham listAllUserKeys ni chaqiramiz
          if (window.CAPIWS && window.CAPIWS.findPfxs) {
            window.CAPIWS.findPfxs(
              () => loadEimzoKeys(),
              () => loadEimzoKeys()
            );
          } else {
            loadEimzoKeys();
          }
        }
      );
    } else {
      // CAPIWS topilmasa, to'g'ridan-to'g'ri listAllUserKeys ni chaqiramiz
      loadEimzoKeys();
    }
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

      // USB-token (ftjc) uchun "vo" yuborilmaydi, faqat E-imzo (pfx) uchun yuboriladi
      const isUsbToken = selectedItem.vo?.type === "ftjc";
      const loginData: { pkcs7: string; vo?: any } = { pkcs7 };
      if (!isUsbToken) {
        loginData.vo = selectedItem.vo;
      }

      const response = await dispatch(
        authApi.endpoints.eimzoLogin.initiate(loginData)
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
      <div className="bg-ice w-[480px] rounded-2xl shadow-md px-7 py-13 flex flex-col gap-4 items-center">
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

          {/* ------------ E-IMZO / USB-TOKEN LOGIN ------------- */}
          <TabsContent value="eimzo" className="pt-6 flex flex-col gap-4">
            <p className="text-sm text-gray-600">{t("eimzoOrUsbDescription")}</p>
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
                    {t("selectCertificatePlaceholder")}
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

                <div className="flex gap-2 flex-col sm:flex-row">
                  <Button
                    onClick={handleEimzoLogin}
                    className="bg-blue-600 text-white h-[45px] hover:bg-blue-700 flex-1"
                    disabled={!selectedKey || isLoading}
                  >
                    {isLoading ? "Ishlanmoqda..." : t("enter")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshKeys}
                    disabled={isLoading}
                    className="h-[45px]"
                  >
                    {t("refreshCertificates")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>{t("notFoundSertificate")}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefreshKeys}
                  disabled={isLoading}
                  className="h-[45px] w-fit"
                >
                  {t("refreshCertificates")}
                </Button>
              </>
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
                    className="text-[#3B82F6] text-[15px] font-medium"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="bg-blue-600 text-white h-[45px] hover:bg-blue-700"
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
