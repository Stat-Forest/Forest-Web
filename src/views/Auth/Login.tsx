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
  const [activeTab, setActiveTab] = useState<"login" | "eimzo" | "usb-token">("login");
  const [eimzoKeysOnly, setEimzoKeysOnly] = useState<EimzoKey[]>([]);
  const [usbTokensOnly, setUsbTokensOnly] = useState<EimzoKey[]>([]);
  const [selectedEimzoKey, setSelectedEimzoKey] = useState<string>("");
  const [selectedUsbToken, setSelectedUsbToken] = useState<string>("");

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
    if (window.CAPIWS && window.CAPIWS.findTokens && window.CAPIWS.findPfxs) {
      // Avval USB-tokenlarni topamiz
      window.CAPIWS.findTokens(
        () => {
          console.log("findTokens: USB-tokenlar topildi");
          // Keyin .pfx fayllarni topamiz
          window.CAPIWS.findPfxs(
            () => {
              console.log("findPfxs: PFX fayllar topildi");
              // Ikkalasini ham topgandan keyin biroz kutib, listAllUserKeys ni chaqiramiz
              // USB-tokenlarni to'liq yuklash uchun vaqt beramiz
              setTimeout(() => {
                loadEimzoKeys();
              }, 500);
            },
            (err: any) => {
              console.warn("findPfxs error:", err);
              // findPfxs xatolik bersa ham listAllUserKeys ni chaqiramiz
              setTimeout(() => {
                loadEimzoKeys();
              }, 500);
            }
          );
        },
        (err: any) => {
          console.warn("findTokens error:", err);
          // findTokens xatolik bersa ham .pfx fayllarni topishga harakat qilamiz
          window.CAPIWS.findPfxs(
            () => {
              setTimeout(() => {
                loadEimzoKeys();
              }, 500);
            },
            () => {
              // Ikkalasi ham xatolik bersa ham listAllUserKeys ni chaqiramiz
              setTimeout(() => {
                loadEimzoKeys();
              }, 500);
            }
          );
        }
      );
    } else {
      // CAPIWS yoki findTokens/findPfxs topilmasa, to'g'ridan-to'g'ri listAllUserKeys ni chaqiramiz
      console.warn("CAPIWS.findTokens yoki CAPIWS.findPfxs topilmadi, to'g'ridan-to'g'ri listAllUserKeys chaqirilmoqda");
      loadEimzoKeys();
    }
  };

  const loadEimzoKeys = () => {
    console.log("loadEimzoKeys: listAllUserKeys chaqirilmoqda...");
    
    // Agar CAPIWS mavjud bo'lsa, to'g'ridan-to'g'ri list_all_user_keys ni chaqiramiz
    if (window.CAPIWS && window.CAPIWS.list_all_user_keys) {
      console.log("CAPIWS.list_all_user_keys to'g'ridan-to'g'ri chaqirilmoqda...");
      window.CAPIWS.list_all_user_keys(
        (items: any[]) => {
          console.log(`CAPIWS.list_all_user_keys: ${items.length} ta key topildi`);
          
          const processedItems: EimzoKey[] = [];
          items.forEach((v: any, i: number) => {
            const now = new Date();
            const validTo = new Date(v.validTo);
            const expired = validTo < now;

            // USB-token yoki E-imzo ekanligini aniqlash
            const keyType = v.type === "ftjc" ? "USB-token" : v.type === "pfx" ? "E-imzo" : "Noma'lum";
            console.log(`Key topildi: ${v.CN} (${keyType})`);

            const itemId = `itm-${v.serialNumber}-${i}`;
            processedItems.push({
              id: itemId,
              value: itemId,
              label: expired ? `${v.CN} ${t("expired")}` : v.CN,
              disabled: expired,
              vo: v,
            });
          });

          // USB-token va E-imzo keylarini ajratib ko'rsatish
          const usbTokens = processedItems.filter(item => item.vo?.type === "ftjc");
          const eimzoKeys = processedItems.filter(item => item.vo?.type === "pfx");
          console.log(`USB-tokenlar: ${usbTokens.length}, E-imzo keylar: ${eimzoKeys.length}`);
          
          setEimzoKeys(processedItems);
          setEimzoKeysOnly(eimzoKeys);
          setUsbTokensOnly(usbTokens);
          
          if (processedItems.length > 0) {
            setSelectedKey(processedItems[0].id);
            if (eimzoKeys.length > 0) setSelectedEimzoKey(eimzoKeys[0].id);
            if (usbTokens.length > 0) setSelectedUsbToken(usbTokens[0].id);
          } else {
            setError(t("notFoundEImzo"));
          }
          setIsLoading(false);
        },
        (r: any) => {
          console.error("CAPIWS.list_all_user_keys xatolik:", r);
          // Xatolik bo'lsa, EIMZOClient orqali sinab ko'ramiz
          loadEimzoKeysViaEIMZOClient();
        }
      );
    } else {
      // CAPIWS topilmasa, EIMZOClient orqali chaqiramiz
      loadEimzoKeysViaEIMZOClient();
    }
  };

  const loadEimzoKeysViaEIMZOClient = () => {
    console.log("loadEimzoKeysViaEIMZOClient: EIMZOClient.listAllUserKeys chaqirilmoqda...");
    window.EIMZOClient.listAllUserKeys(
      (o: any, i: number) => `itm-${o.serialNumber}-${i}`,
      (itemId: string, v: any) => {
        const now = new Date();
        const validTo = new Date(v.validTo);
        const expired = validTo < now;

        // USB-token yoki E-imzo ekanligini aniqlash
        const keyType = v.type === "ftjc" ? "USB-token" : v.type === "pfx" ? "E-imzo" : "Noma'lum";
        console.log(`Key topildi: ${v.CN} (${keyType})`);

        return {
          id: itemId,
          value: itemId,
          label: expired ? `${v.CN} ${t("expired")}` : v.CN,
          disabled: expired,
          vo: v,
        };
      },
      (items: EimzoKey[], firstId: string) => {
        console.log(`EIMZOClient.listAllUserKeys: ${items.length} ta key topildi`);
        // USB-token va E-imzo keylarini ajratib ko'rsatish
        const usbTokens = items.filter(item => item.vo?.type === "ftjc");
        const eimzoKeys = items.filter(item => item.vo?.type === "pfx");
        console.log(`USB-tokenlar: ${usbTokens.length}, E-imzo keylar: ${eimzoKeys.length}`);
        
        setEimzoKeys(items);
        setEimzoKeysOnly(eimzoKeys);
        setUsbTokensOnly(usbTokens);
        
        if (items.length > 0) {
          setSelectedKey(firstId);
          if (eimzoKeys.length > 0) setSelectedEimzoKey(eimzoKeys[0].id);
          if (usbTokens.length > 0) setSelectedUsbToken(usbTokens[0].id);
        } else {
          setError(t("notFoundEImzo"));
        }
        setIsLoading(false);
      },
      (r: any) => {
        console.error("EIMZOClient.listAllUserKeys xatolik:", r);
        setError(r || t("cannotFindKeys"));
        setIsLoading(false);
      }
    );
  };

  // Challenge olish (demo kod bilan mos)
  const getChallenge = async (): Promise<string> => {
    try {
      const uniqueId = Date.now() + "_" + Math.random();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/authentications/frontend/challenge?_uc=${uniqueId}`
      );

      if (!response.ok) {
        throw new Error(`${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status !== 1) {
        throw new Error(`${data.status} - ${data.message || "Challenge olinmadi"}`);
      }

      return data.challenge;
    } catch (error: any) {
      // Agar challenge endpoint mavjud bo'lmasa, fallback matn ishlatamiz
      console.warn("Challenge endpoint mavjud emas, fallback matn ishlatilmoqda:", error);
      return t("confirmation");
    }
  };

  // USB-token login (demo'dagi signinToken funksiyasi)
  const handleUsbTokenLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Challenge olish
      const challenge = await getChallenge();

      // 2. USB-token uchun keyId = "ckc" (demo kod bilan mos)
      const keyId = "ckc";

      // 3. PKCS#7 imzo yaratish
      const pkcs7 = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.createPkcs7(
          keyId,
          challenge,
          null,
          (signature: string) => resolve(signature),
          (r: any) => {
            const msg = r?.includes("BadPaddingException")
              ? t("inCorrectPass")
              : r || t("cannotCreateSignature");
            reject(msg);
          },
          false // detached = false
        );
      });

      // 4. Backend'ga yuborish (USB-token uchun vo yuborilmaydi)
      const loginData: { pkcs7: string } = { pkcs7 };

      const response = await dispatch(
        authApi.endpoints.eimzoLogin.initiate(loginData)
      ).unwrap();

      if (response?.access) {
        navigate("/main");
      } else {
        throw new Error("Token olinmadi");
      }
    } catch (err: any) {
      setError(err?.message || err || t("eImzoErr"));
    } finally {
      setIsLoading(false);
    }
  };

  // E-imzo (PFX) login
  const handleEimzoLogin = async (keyId?: string) => {
    const keyToUse = keyId || selectedKey;
    if (!keyToUse) return setError(t("selectCertificate"));

    const selectedItem = eimzoKeys.find((item) => item.id === keyToUse);
    if (!selectedItem) return setError(t("invalidSelectedCertificate"));

    setIsLoading(true);
    setError(null);

    try {
      // 1. Challenge olish
      const challenge = await getChallenge();

      // 2. Kalitni yuklash
      const loadedKeyId = await new Promise<string>((resolve, reject) => {
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

      // 3. PKCS#7 imzo yaratish
      const pkcs7 = await new Promise<string>((resolve, reject) => {
        window.EIMZOClient.createPkcs7(
          loadedKeyId,
          challenge,
          null,
          (signature: string) => resolve(signature),
          (r: any) => {
            const msg = r?.includes("BadPaddingException")
              ? t("inCorrectPass")
              : r || t("cannotCreateSignature");
            reject(msg);
          },
          false // detached = false
        );
      });

      // 4. Backend'ga yuborish (PFX uchun vo yuboriladi)
      const loginData: { pkcs7: string; vo: any } = {
        pkcs7,
        vo: selectedItem.vo,
      };

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

        {/* Login method selection buttons */}
        <div className="w-full flex gap-2 mb-2">
          <Button
            type="button"
            variant={activeTab === "login" ? "default" : "outline"}
            onClick={() => setActiveTab("login")}
            className={`flex-1 h-[45px] text-sm ${
              activeTab === "login"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t("login")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "eimzo" ? "default" : "outline"}
            onClick={() => setActiveTab("eimzo")}
            className={`flex-1 h-[45px] text-sm ${
              activeTab === "eimzo"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            E-imzo
          </Button>
          <Button
            type="button"
            variant={activeTab === "usb-token" ? "default" : "outline"}
            onClick={() => setActiveTab("usb-token")}
            className={`flex-1 h-[45px] text-sm ${
              activeTab === "usb-token"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            USB-token
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "eimzo" | "login" | "usb-token")} className="w-full">
          <TabsList className="hidden">
            <TabsTrigger value="eimzo">E-imzo</TabsTrigger>
            <TabsTrigger value="usb-token">USB-token</TabsTrigger>
            <TabsTrigger value="login">{t("login")}</TabsTrigger>
          </TabsList>

          {/* ------------ E-IMZO (PFX) LOGIN ------------- */}
          <TabsContent value="eimzo" className="pt-6 flex flex-col gap-4">
            <p className="text-sm text-gray-600">E-imzo sertifikati (PFX fayl) orqali kirish</p>
            {isLoading ? (
              <p>Yuklanmoqda...</p>
            ) : eimzoKeysOnly.length > 0 ? (
              <>
                <select
                  value={selectedEimzoKey}
                  onChange={(e) => setSelectedEimzoKey(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="" disabled>
                    E-imzo sertifikatini tanlang
                  </option>
                  {eimzoKeysOnly.map((key) => (
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
                    onClick={() => handleEimzoLogin(selectedEimzoKey)}
                    className="bg-blue-600 text-white h-[45px] hover:bg-blue-700 flex-1"
                    disabled={!selectedEimzoKey || isLoading}
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
                <p>E-imzo sertifikatlari topilmadi</p>
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

          {/* ------------ USB-TOKEN LOGIN ------------- */}
          <TabsContent value="usb-token" className="pt-6 flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              USB-token (ID-card, BAIK-token) orqali kirish
            </p>
            <p className="text-xs text-gray-500">
              USB-token ulanganligini tekshiring va "Kirish" tugmasini bosing
            </p>

            <div className="flex gap-2 flex-col sm:flex-row">
              <Button
                onClick={handleUsbTokenLogin}
                className="bg-blue-600 text-white h-[45px] hover:bg-blue-700 flex-1"
                disabled={isLoading}
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

            {usbTokensOnly.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                {usbTokensOnly.length} ta USB-token topildi
              </div>
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
