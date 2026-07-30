import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
import { setToken } from "@/features/authSlice";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Credentials, EimzoKey } from "@/types/auth";
import { getEimzoApiKeys } from "@/utils/eimzoConfig";
import { toast } from "react-toastify";
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Usb,
  Key,
  LogIn,
  VideoIcon,
} from "lucide-react";
import { useEimzoLoginMutation } from "@/services/eimzoApi";

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
  const [isLoading, setIsLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"login" | "eimzo" | "usb-token">(
    "login",
  );
  const [eimzoKeysOnly, setEimzoKeysOnly] = useState<EimzoKey[]>([]);
  const [selectedEimzoKey, setSelectedEimzoKey] = useState<string>("");
  const [isEimzoInitialized, setIsEimzoInitialized] = useState(false);

  const [eimzoHandler] = useEimzoLoginMutation();

  // -------- TOAST NOTIFICATION HELPERS ---------------
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "error",
  ) => {
    if (type === "error") {
      toast.error(message);
    } else if (type === "success") {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };

  // -------- E-IMZO UI HELPERS ---------------
  const uiShowMessage = (message: string, type: "error" | "info" = "error") => {
    setError(message);
    if (type === "error") {
      showToast(message, "error");
    }
  };

  const uiLoading = () => {
    setIsLoading(true);
    setError(t("loading"));
  };

  const uiNotLoaded = (e: any) => {
    setError("");
    if (e) {
      wsError(e);
    } else {
      uiShowMessage(t("wsNotSupported"), "error");
    }
  };

  const uiUpdateApp = () => {
    uiShowMessage(t("eimzoUpdateRequired"), "error");
  };

  const uiAppLoad = useCallback(() => {
    uiClearCombo();
    if (!window.EIMZOClient) {
      uiShowMessage(t("eimzoClientNotLoaded"), "error");
      return;
    }

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
      uiHandleError,
    );
  }, [t]);

  const uiComboSelect = (itm: string | null) => {
    if (itm) {
      const item = eimzoKeys.find((k) => k.id === itm);
      if (item?.vo?.type === "pfx") {
        setSelectedEimzoKey(itm);
      }
    }
  };

  const uiClearCombo = () => {
    setEimzoKeys([]);
    setEimzoKeysOnly([]);
    setSelectedEimzoKey("");
  };

  const uiFillCombo = (items: any[]) => {
    const processedItems: EimzoKey[] = [];
    const eimzoKeysList: EimzoKey[] = [];

    items.forEach((item: any) => {
      try {
        const vo =
          item.vo ||
          (typeof item.getAttribute === "function"
            ? JSON.parse(item.getAttribute("vo"))
            : null);

        if (!vo) return;

        const processed: EimzoKey = {
          id: item.id || item.value,
          value: item.value || item.id || "",
          label: item.label || item.text || vo.CN,
          disabled: item.disabled || false,
          vo: vo,
        };

        processedItems.push(processed);

        if (vo.type === "pfx") {
          eimzoKeysList.push(processed);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error processing certificate:", error);
        }
      }
    });

    setEimzoKeys(processedItems);
    setEimzoKeysOnly(eimzoKeysList);

    if (processedItems.length > 0) {
      const firstEimzoKey =
        eimzoKeysList.find((k) => !k.disabled)?.id || eimzoKeysList[0]?.id;
      if (firstEimzoKey) setSelectedEimzoKey(firstEimzoKey);
    }
  };

  const uiLoaded = () => {
    setError("");
    setIsLoading(false);
  };

  const uiCreateItem = (itmkey: string, vo: any): any => {
    const now = new Date();
    vo.expired = window.dates?.compare(now, vo.validTo) > 0;

    return {
      id: itmkey,
      value: itmkey,
      label: vo.expired ? vo.CN + " " + t("expired") : vo.CN,
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
      const errorCAPIWS = t("eImzoConnectionErr");
      uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e), "error");
    } else {
      uiShowMessage(t("wsNotSupported"), "error");
    }
  };

  const wsErroCodeDesc = (code: number) => {
    const reasons: { [key: number]: string } = {
      1000: t("wsError1000"),
      1001: t("wsError1001"),
      1002: t("wsError1002"),
      1003: t("wsError1003"),
      1006: t("wsError1006"),
      1007: t("wsError1007"),
      1008: t("wsError1008"),
      1009: t("wsError1009"),
      1010: t("wsError1010"),
      1011: t("wsError1011"),
      1015: t("wsError1015"),
    };
    return code + " - " + (reasons[code] || t("wsErrorUnknown"));
  };

  const uiHandleError = (e: any, r: any) => {
    uiHideProgress();
    if (r) {
      const errorMessage = String(r);
      if (errorMessage.includes("BadPaddingException")) {
        uiShowMessage(t("inCorrectPass"), "error");
      } else if (
        errorMessage.includes("Token not found") ||
        errorMessage.includes("No token present")
      ) {
        uiShowMessage(t("usbTokenNotFound"), "error");
      } else if (errorMessage.includes("PIN") || errorMessage.includes("pin")) {
        uiShowMessage(t("incorrectPin"), "error");
      } else if (
        errorMessage.includes("expired") ||
        errorMessage.includes("muddati")
      ) {
        uiShowMessage(t("certExpired"), "error");
      } else {
        uiShowMessage(errorMessage, "error");
      }
    }
    if (e) wsError(e);
  };

  // -------- E-IMZO INITIALIZATION ---------------
  useEffect(() => {
    if (!window.EIMZOClient) {
      setError(t("eimzoClientNotLoaded"));
      return;
    }

    initializeEimzo();
  }, [t]);

  useEffect(() => {
    if (activeTab === "usb-token" && isEimzoInitialized) {
      detectUsbTokens();
    }
  }, [activeTab, isEimzoInitialized]);

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
        const installedVersion =
          parseInt(major.toString()) * 100 + parseInt(minor.toString());

        if (installedVersion < newVersion) {
          uiUpdateApp();
          setIsLoading(false);
        } else {
          installApiKeys();
        }
      },
      (e: any, r: any) => {
        if (r) {
          uiShowMessage(r, "error");
        } else {
          uiNotLoaded(e);
        }
        setIsLoading(false);
      },
    );
  };

  const installApiKeys = () => {
    window.EIMZOClient.installApiKeys(
      () => {
        uiAppLoad();
        setIsEimzoInitialized(true);
        showToast(t("eimzoSuccess"), "success");
      },
      (e: any, r: any) => {
        if (r) {
          uiShowMessage(r, "error");
        } else {
          wsError(e);
        }
        setIsLoading(false);
      },
    );
  };

  // -------- USB TOKEN DETECTION ---------------
  const detectUsbTokens = async () => {
    if (!isEimzoInitialized) return;

    try {
      refreshAllKeys();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("USB token detection error:", error);
      }
      refreshAllKeys();
    }
  };

  const refreshAllKeys = () => {
    uiAppLoad();
  };

  const handleRefreshKeys = () => {
    setError(null);
    if (activeTab === "usb-token") {
      detectUsbTokens();
    } else {
      uiLoading();
      uiAppLoad();
    }
  };

  // -------- AUTHENTICATION FUNCTIONS ---------------
  const getChallenge = (callback: (challenge: string) => void) => {
    const challenge =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    callback(challenge);
  };

  const handleEimzoLogin = (pkcs7: string) => {
    eimzoHandler({ pkcs7 })
      .unwrap()
      .then((response: any) => {
        uiHideProgress();
        const access = response?.access;
        if (!access) {
          uiShowMessage(t("loginFailedNoToken"), "error");
          return;
        }
        dispatch(setToken({ token: access, user: response }));
        showToast(t("loginSuccess"), "success");
        navigate("/main");
      })
      .catch((error: any) => {
        uiHideProgress();
        const errorMsg =
          error?.data?.message ||
          error?.message ||
          t("serverConnectError");
        uiShowMessage(errorMsg, "error");
      });
  };

  const auth = (keyId: string, challenge: string) => {
    // Himoya: E-IMZO mavjudmi
    if (!window.EIMZOClient) {
      uiShowMessage(t("eimzoClientNotLoaded"), "error");
      uiHideProgress();
      return;
    }

    // Himoya: majburiy parametrlar
    if (!keyId || !challenge) {
      uiShowMessage(t("signingDataInsufficient"), "error");
      uiHideProgress();
      return;
    }

    try {
      window.EIMZOClient.createPkcs7(
        keyId,
        challenge,
        undefined,

        (pkcs7: string) => {
          if (!pkcs7) {
            uiHideProgress();
            uiShowMessage(t("pkcs7NotCreated"), "error");
            return;
          }

          handleEimzoLogin(pkcs7);
        },

        (e: any, r: any) => {
          uiHideProgress();

          if (r) {
            if (r.includes("BadPaddingException")) {
              uiShowMessage(t("inCorrectPass"), "error");
              return;
            }

            if (r.includes("PIN") || r.includes("pin")) {
              uiShowMessage(t("incorrectPin"), "error");
              return;
            }

            if (
              r.includes("Token not found") ||
              r.includes("No token present")
            ) {
              uiShowMessage(t("usbTokenNotFound"), "error");
              return;
            }

            if (r.includes("expired") || r.includes("muddati")) {
              uiShowMessage(t("certExpired"), "error");
              return;
            }

            uiShowMessage(r, "error");
          }

          if (e) {
            wsError(e);
          }
        },
        false
      );
    } catch (err) {
      uiHideProgress();
      console.error("E-IMZO createPkcs7 exception:", err);
      uiShowMessage(t("unexpectedSignError"), "error");
    }
  };

  const signinPFX = () => {
    uiShowProgress();

    const itm = selectedEimzoKey;
    if (!itm) {
      uiShowMessage(t("selectCertFirst"), "error");
      uiHideProgress();
      return;
    }

    getChallenge((challenge: string) => {
      const selectedItem = eimzoKeysOnly.find((item) => item.id === itm);

      if (!selectedItem) {
        uiHideProgress();
        uiShowMessage(t("certNotFound"), "error");
        return;
      }

      window.EIMZOClient.loadKey(
        selectedItem.vo,
        (keyId: string) => {
          auth(keyId, challenge);
        },
        uiHandleError,
      );
    });
  };

  const signinToken = () => {
    if (!window.EIMZOClient) {
      uiShowMessage(t("eimzoClientNotLoaded"), "error");
      return;
    }

    uiShowProgress();

    // Misoldagi kabi: USB-token uchun keyId "ckc" — loadKey kerak emas
    getChallenge((challenge: string) => {
      auth("ckc", challenge);
    });
  };

  // -------- LOGIN BY EMAIL/PASSWORD --------------
  const checkAuthHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

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
      showToast("Muvaffaqiyatli kirish", "success");
      navigate("/main");
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("Login failed:", error);
      }

      let msg =
        error?.data ||
        error?.data?.detail ||
        error?.data?.errors ||
        error?.data?.message ||
        "Авторизация не удалась.";

      if (Array.isArray(msg)) msg = msg.join(", ");
      if (typeof msg === "object") msg = Object.values(msg).join(", ");

      setError(msg);
      showToast(msg, "error");
    }
  };

  return (
    <div className="flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors duration-200">
      <div className="w-full max-w-xl rounded-2xl px-8 py-8 flex flex-col gap-5">
        {/* Header */}
        <div className="text-center flex justify-between items-center mb-1">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            {t("loginTitle")}
          </h2>
          <Button
            className="bg-[#00BC7D] hover:bg-[#00a36c] text-white h-[44px] font-bold w-[180px]"
            onClick={() => navigate("/auth/auth_video")}
          >
            <VideoIcon size={40} />
            {t("item_65")}
          </Button>
        </div>

        {/* Login method selection */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4">
          <Button
            type="button"
            variant={activeTab === "login" ? "default" : "outline"}
            onClick={() => setActiveTab("login")}
            className={`h-12 text-sm font-medium transition-all duration-200 ${
              activeTab === "login"
                ? "bg-[#00BC7D] hover:bg-[#00a36c] text-white shadow-sm"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t("login")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "eimzo" ? "default" : "outline"}
            onClick={() => setActiveTab("eimzo")}
            className={`h-12 text-sm font-medium transition-all duration-200 ${
              activeTab === "eimzo"
                ? "bg-[#00BC7D] hover:bg-[#00a36c] text-white shadow-sm"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Key className="w-4 h-4 mr-2" />
            E-imzo
          </Button>
          <Button
            type="button"
            variant={activeTab === "usb-token" ? "default" : "outline"}
            onClick={() => setActiveTab("usb-token")}
            className={`h-12 text-sm font-medium transition-all duration-200 ${
              activeTab === "usb-token"
                ? "bg-[#00BC7D] hover:bg-[#00a36c] text-white shadow-sm"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Usb className="w-4 h-4 mr-2" />
            USB-token
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          {/* ------------ E-IMZO (PFX) LOGIN ------------- */}
          <TabsContent value="eimzo" className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                E-imzo sertifikati (PFX fayl) orqali kirish
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Kompyuteringizda saqlangan sertifikat
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#00BC7D]" />
                <p className="mt-2 text-gray-600 dark:text-slate-300">
                  Sertifikatlar yuklanmoqda...
                </p>
              </div>
            ) : eimzoKeysOnly.length > 0 ? (
              <>
                <div>
                  <Label htmlFor="eimzo-select" className="mb-2 block text-slate-700 dark:text-slate-200">
                    Sertifikatni tanlang:
                  </Label>
                  <select
                    id="eimzo-select"
                    value={selectedEimzoKey}
                    onChange={(e) => setSelectedEimzoKey(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00BC7D] focus:border-[#00BC7D]"
                    disabled={isLoading}
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      E-imzo sertifikatini tanlang
                    </option>
                    {eimzoKeysOnly.map((key) => (
                      <option
                        key={key.id}
                        value={key.id}
                        disabled={key.disabled}
                        className={`bg-white dark:bg-slate-800 ${key.disabled ? "text-gray-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
                      >
                        {key.label}
                        {key.disabled && " (muddati tugagan)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={signinPFX}
                    className="flex-1 h-12 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-medium"
                    disabled={!selectedEimzoKey || isLoading || showProgress}
                  >
                    {showProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Imzolanmoqda...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        {t("enter")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshKeys}
                    disabled={isLoading || showProgress}
                    className="h-12 px-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Key className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500" />
                <p className="mt-2 text-gray-600 dark:text-slate-300">
                  E-imzo sertifikatlari topilmadi
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  E-IMZO dasturini o'rnating yoki sertifikat qo'shing
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefreshKeys}
                  disabled={isLoading}
                  className="mt-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("refreshCertificates")}
                </Button>
              </div>
            )}

            {showProgress && (
              <div className="flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-[#00BC7D] mr-2" />
                <span className="text-emerald-700 dark:text-emerald-300">Imzolanmoqda, kuting...</span>
              </div>
            )}
          </TabsContent>

          {/* ------------ USB-TOKEN LOGIN (misoldagi kabi: keyId "ckc") ------------- */}
          <TabsContent value="usb-token" className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                USB-token (ID-card, BAIK-token) orqali kirish
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Fizik USB token ulanib turgan bo'lishi kerak. Tugmani bosganda PIN so'raladi.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={signinToken}
                className="flex-1 h-12 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-medium"
                disabled={isLoading || showProgress}
              >
                {showProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Imzolanmoqda...
                  </>
                ) : (
                  <>
                    <Usb className="w-4 h-4 mr-2" />
                    {t("enter")}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("https://e-imzo.uz/help", "_blank")}
                disabled={isLoading || showProgress}
                className="h-12 px-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <AlertCircle className="w-4 h-4" />
              </Button>
            </div>

            {showProgress && (
              <div className="flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-[#00BC7D] mr-2" />
                <span className="text-emerald-700 dark:text-emerald-300">Imzolanmoqda, kuting...</span>
              </div>
            )}
          </TabsContent>

          {/* ------------ SIMPLE LOGIN ------------- */}
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={checkAuthHandler} className="space-y-5">
              <div>
                <Label htmlFor="email" className="mb-2 block text-slate-700 dark:text-slate-200 font-medium">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  className="h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00BC7D] focus:border-[#00BC7D]"
                  autoComplete="username"
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2 block text-slate-700 dark:text-slate-200 font-medium">
                  {t("password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    className="h-12 pr-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00BC7D] focus:border-[#00BC7D]"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-transparent dark:hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex justify-end mt-2">
                  <Link
                    to="/auth/forget-password"
                    className="text-sm text-[#00BC7D] hover:text-[#00a36c] font-medium transition-colors"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#00BC7D] hover:bg-[#00a36c] text-white font-medium shadow-sm"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t("enter")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
