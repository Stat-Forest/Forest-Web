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
import { toast } from "react-toastify";

declare global {
  interface Window {
    EIMZOClient: any;
    CAPIWS: any;
    dates: any;
    microAjax: any;
  }
}

function Login() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [eimzoKeys, setEimzoKeys] = useState<EimzoKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"login" | "eimzo" | "usb-token">("login");
  const [eimzoKeysOnly, setEimzoKeysOnly] = useState<EimzoKey[]>([]);
  const [usbTokensOnly, setUsbTokensOnly] = useState<EimzoKey[]>([]);
  const [selectedEimzoKey, setSelectedEimzoKey] = useState<string>("");

  // -------- E-IMZO UI HELPERS ---------------
  
  const uiShowMessage = (message: string) => {
    toast.error(message);
  };

  const uiLoading = () => {
    setIsLoading(true);
    setError("Загрузка ...");
  };

  const uiNotLoaded = (e: any) => {
    setError("");
    if (e) {
      wsError(e);
    } else {
      uiShowMessage("Браузер не поддерживает технологию WebSocket. Установите последнюю версию браузера.");
    }
  };

  const uiUpdateApp = () => {
    setError("ВНИМАНИЕ !!! Установите новую версию приложения E-IMZO.");
  };

  const uiAppLoad = () => {
    uiClearCombo();
    window.EIMZOClient.listAllUserKeys(
      (o: any, i: number) => {
        const itemId = "itm-" + o.serialNumber + "-" + i;
        return itemId;
      },
      (itemId: string, v: any) => {
        return uiCreateItem(itemId, v);
      },
      (items: any[], firstId: string | null) => {
        uiFillCombo(items);
        uiLoaded();
        uiComboSelect(firstId);
      },
      uiHandleError
    );
  };

  const uiComboSelect = (itm: string | null) => {
    if (itm) {
      setSelectedKey(itm);
      setSelectedEimzoKey(itm);
    }
  };

  const cbChanged = () => {
    // Select changed callback
  };

  const uiClearCombo = () => {
    setEimzoKeys([]);
    setEimzoKeysOnly([]);
    setUsbTokensOnly([]);
    setSelectedKey("");
    setSelectedEimzoKey("");
  };

  const uiFillCombo = (items: any[]) => {
    const processedItems: EimzoKey[] = [];
    const usbTokens: EimzoKey[] = [];
    const eimzoKeys: EimzoKey[] = [];

    items.forEach((item: any) => {
      const processed: EimzoKey = {
        id: item.id || item.value,
        value: item.id || item.value,
        label: item.label || item.text,
        disabled: item.disabled || false,
        vo: item.vo || JSON.parse(item.getAttribute?.("vo")),
      };

      processedItems.push(processed);

      if (processed.vo?.type === "ftjc") {
        usbTokens.push(processed);
      } else if (processed.vo?.type === "pfx") {
        eimzoKeys.push(processed);
      }
    });

    setEimzoKeys(processedItems);
    setEimzoKeysOnly(eimzoKeys);
    setUsbTokensOnly(usbTokens);

    if (processedItems.length > 0) {
      setSelectedKey(processedItems[0].id);
      if (eimzoKeys.length > 0) setSelectedEimzoKey(eimzoKeys[0].id);
    }
  };

  const uiLoaded = () => {
    setError("");
    setIsLoading(false);
  };

  const uiCreateItem = (itmkey: string, vo: any) => {
    const now = new Date();
    vo.expired = window.dates?.compare(now, vo.validTo) > 0;

    return {
      id: itmkey,
      value: itmkey,
      label: vo.expired ? vo.CN + " (срок истек)" : vo.CN,
      disabled: vo.expired,
      vo: vo,
    };
  };

  const uiShowProgress = () => {
    setShowProgress(true);
  };

  const uiHideProgress = () => {
    setShowProgress(false);
  };

  const wsError = (e: any) => {
    if (e) {
      const errorCAPIWS = "Ошибка соединения с E-IMZO. Возможно у вас не установлен модуль E-IMZO.";
      uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e));
    } else {
      uiShowMessage("Браузер не поддерживает технологию WebSocket. Установите последнюю версию браузера.");
    }
  };

  const wsErroCodeDesc = (code: number) => {
    const reasons: { [key: number]: string } = {
      1000: "Normal closure",
      1001: "Going away",
      1002: "Protocol error",
      1003: "Unsupported data",
      1006: "Abnormal closure",
      1007: "Invalid frame payload data",
      1008: "Policy violation",
      1009: "Message too big",
      1010: "Missing extension",
      1011: "Internal error",
      1015: "TLS handshake failure"
    };
    return code + " - " + (reasons[code] || "Unknown error");
  };

  const uiHandleError = (e: any, r: any) => {
    uiHideProgress();
    if (r) {
      if (r.indexOf("BadPaddingException") != -1) {
        uiShowMessage("Пароль неверный.");
      } else {
        uiShowMessage(r);
      }
    }
    if (e) wsError(e);
  };

  // -------- E-IMZO INITIALIZATION ---------------
  
  useEffect(() => {
    if (!window.EIMZOClient) {
      setError("E-IMZO klienti yuklanmadi. Iltimos, sahifani yangilang yoki E-IMZO dasturini o'rnating.");
      return;
    }
    
    initializeEimzo();
  }, []);

  const initializeEimzo = () => {
    uiLoading();
    setError(null);

    const apiKeys = getEimzoApiKeys();
    window.EIMZOClient.API_KEYS = apiKeys;

    window.EIMZOClient.checkVersion(
      (major: number, minor: number) => {
        const EIMZO_MAJOR = 3;
        const EIMZO_MINOR = 37;
        const newVersion = EIMZO_MAJOR * 100 + EIMZO_MINOR;
        const installedVersion = parseInt(major.toString()) * 100 + parseInt(minor.toString());
        
        if (installedVersion < newVersion) {
          uiUpdateApp();
          setIsLoading(false);
        } else {
          installApiKeys();
        }
      },
      (e: any, r: any) => {
        if (r) {
          uiShowMessage(r);
        } else {
          uiNotLoaded(e);
        }
        setIsLoading(false);
      }
    );
  };

  const installApiKeys = () => {
    window.EIMZOClient.installApiKeys(
      () => {
        uiAppLoad();
      },
      (e: any, r: any) => {
        if (r) {
          uiShowMessage(r);
        } else {
          wsError(e);
        }
        setIsLoading(false);
      }
    );
  };

  const handleRefreshKeys = () => {
    setError(null);
    uiLoading();
    uiAppLoad();
  };

  // -------- AUTHENTICATION FUNCTIONS ---------------

  const getChallenge = (callback: (challenge: string) => void) => {
    const challenge = Math.random().toString(36).substring(2) + Date.now().toString(36);
    callback(challenge);
  };

  const auth = (keyId: string, challenge: string, vo?: any) => {
    window.EIMZOClient.createPkcs7(
      keyId,
      challenge,
      null,
      (pkcs7: string) => {
        const loginData: { pkcs7: string; vo: any } = { pkcs7, vo };

        dispatch(authApi.endpoints.eimzoLogin.initiate(loginData))
          .unwrap()
          .then((response: any) => {
            uiHideProgress();
            if (response?.access) {
              navigate("/main");
            } else {
              uiShowMessage("Kirish muvaffaqiyatsiz: Token topilmadi");
            }
          })
          .catch((error: any) => {
            uiHideProgress();
            const errorMsg = error?.data?.message || error?.message || "Server bilan aloqa xatoligi";
            uiShowMessage(errorMsg);
          });
      },
      (e: any, r: any) => {
        uiHandleError(e, r);
      },
      false
    );
  };

  const signinPFX = () => {
    uiShowProgress();

    const itm = selectedEimzoKey || selectedKey;
    if (!itm) {
      uiShowMessage("Iltimos, sertifikatni tanlang");
      uiHideProgress();
      return;
    }

    getChallenge((challenge: string) => {
      const selectedItem = eimzoKeys.find((item) => item.id === itm);
      if (selectedItem) {
        window.EIMZOClient.loadKey(
          selectedItem.vo,
          (id: string) => {
            auth(id, challenge, selectedItem.vo);
          },
          uiHandleError
        );
      } else {
        uiHideProgress();
        uiShowMessage("Sertifikat topilmadi");
      }
    });
  };

  const signinToken = () => {
    uiShowProgress();

    getChallenge((challenge: string) => {
      // Get USB token VO data
      const usbToken = usbTokensOnly.length > 0 ? usbTokensOnly[0] : null;
      const keyId = "ckc";
      auth(keyId, challenge, usbToken?.vo);
    });
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
                  onChange={(e) => {
                    setSelectedEimzoKey(e.target.value);
                    cbChanged();
                  }}
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
                    onClick={signinPFX}
                    className="bg-blue-600 text-white h-[45px] hover:bg-blue-700 flex-1"
                    disabled={!selectedEimzoKey || isLoading}
                  >
                    {isLoading || showProgress ? "Ishlanmoqda..." : t("enter")}
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
            {showProgress && (
              <p className="text-green-600">Идет подписание, ждите.</p>
            )}
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
                onClick={signinToken}
                className="bg-blue-600 text-white h-[45px] hover:bg-blue-700 flex-1"
                disabled={isLoading}
              >
                {isLoading || showProgress ? "Ishlanmoqda..." : t("enter")}
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
            {showProgress && (
              <p className="text-green-600">Идет подписание, ждите.</p>
            )}
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