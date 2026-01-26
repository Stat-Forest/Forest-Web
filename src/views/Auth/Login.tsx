import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/authApi";
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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"login" | "eimzo" | "usb-token">(
    "login",
  );
  const [eimzoKeysOnly, setEimzoKeysOnly] = useState<EimzoKey[]>([]);
  const [usbTokensOnly, setUsbTokensOnly] = useState<EimzoKey[]>([]);
  const [selectedEimzoKey, setSelectedEimzoKey] = useState<string>("");
  const [usbTokenLoading, setUsbTokenLoading] = useState(false);
  const [isEimzoInitialized, setIsEimzoInitialized] = useState(false);

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
    setError("Yuklanmoqda...");
  };

  const uiNotLoaded = (e: any) => {
    setError("");
    if (e) {
      wsError(e);
    } else {
      uiShowMessage(
        "Brauzer WebSocket texnologiyasini qo'llab-quvvatlamaydi. Brauzeringizni yangilang.",
        "error",
      );
    }
  };

  const uiUpdateApp = () => {
    uiShowMessage(
      "DIQQAT! E-IMZO dasturining yangi versiyasini o'rnating.",
      "error",
    );
  };

  const uiAppLoad = useCallback(() => {
    uiClearCombo();
    if (!window.EIMZOClient) {
      uiShowMessage("E-IMZO klienti yuklanmagan. Sahifani yangilang.", "error");
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
  }, []);

  const uiComboSelect = (itm: string | null) => {
    if (itm) {
      setSelectedKey(itm);
      const item = eimzoKeys.find((k) => k.id === itm);
      if (item?.vo?.type === "pfx") {
        setSelectedEimzoKey(itm);
      }
    }
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
          value: item.id || item.value,
          label: item.label || item.text || vo.CN,
          disabled: item.disabled || false,
          vo: vo,
        };

        processedItems.push(processed);

        if (vo.type === "ftjc") {
          usbTokens.push(processed);
        } else if (vo.type === "pfx") {
          eimzoKeysList.push(processed);
        }
      } catch (error) {
        console.error("Error processing certificate:", error);
      }
    });

    setEimzoKeys(processedItems);
    setEimzoKeysOnly(eimzoKeysList);
    setUsbTokensOnly(usbTokens);

    if (processedItems.length > 0) {
      const firstKey =
        processedItems.find((k) => !k.disabled)?.id || processedItems[0].id;
      setSelectedKey(firstKey);

      const firstEimzoKey =
        eimzoKeysList.find((k) => !k.disabled)?.id || eimzoKeysList[0]?.id;
      if (firstEimzoKey) setSelectedEimzoKey(firstEimzoKey);
    }
  };

  const uiLoaded = () => {
    setError("");
    setIsLoading(false);
    setUsbTokenLoading(false);
  };

  const uiCreateItem = (itmkey: string, vo: any): any => {
    const now = new Date();
    vo.expired = window.dates?.compare(now, vo.validTo) > 0;

    return {
      id: itmkey,
      value: itmkey,
      label: vo.expired ? vo.CN + " (muddati tugagan)" : vo.CN,
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
      const errorCAPIWS =
        "E-IMZO bilan ulanishda xatolik. E-IMZO moduli o'rnatilmagan bo'lishi mumkin.";
      uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e), "error");
    } else {
      uiShowMessage(
        "Brauzer WebSocket texnologiyasini qo'llab-quvvatlamaydi. Brauzeringizni yangilang.",
        "error",
      );
    }
  };

  const wsErroCodeDesc = (code: number) => {
    const reasons: { [key: number]: string } = {
      1000: "Normal yopish",
      1001: "Ketish",
      1002: "Protokol xatosi",
      1003: "Qo'llab-quvvatlanmaydigan ma'lumot",
      1006: "Noormal yopish",
      1007: "Noto'g'ri freym ma'lumoti",
      1008: "Siyosat buzilishi",
      1009: "Xabar juda katta",
      1010: "Kengaytma yo'q",
      1011: "Ichki xato",
      1015: "TLS qo'l siqish xatosi",
    };
    return code + " - " + (reasons[code] || "Noma'lum xato");
  };

  const uiHandleError = (e: any, r: any) => {
    uiHideProgress();
    if (r) {
      if (r.includes("BadPaddingException")) {
        uiShowMessage("Parol noto'g'ri.", "error");
      } else if (
        r.includes("Token not found") ||
        r.includes("No token present")
      ) {
        uiShowMessage("USB-token topilmadi. Iltimos, token ulang.", "error");
      } else if (r.includes("PIN") || r.includes("pin")) {
        uiShowMessage("PIN-kod noto'g'ri yoki token bloklangan.", "error");
      } else if (r.includes("expired") || r.includes("muddati")) {
        uiShowMessage("Sertifikatning muddati tugagan.", "error");
      } else {
        uiShowMessage(r, "error");
      }
    }
    if (e) wsError(e);
  };

  // -------- E-IMZO INITIALIZATION ---------------
  useEffect(() => {
    if (!window.EIMZOClient) {
      setError(
        "E-IMZO klienti yuklanmadi. Iltimos, sahifani yangilang yoki E-IMZO dasturini o'rnating.",
      );
      return;
    }

    initializeEimzo();
  }, []);

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
        showToast("E-IMZO muvaffaqiyatli ishga tushirildi", "success");
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

    setUsbTokenLoading(true);
    try {
      if (window.CAPIWS) {
        // Direct CAPIWS detection for USB tokens
        window.CAPIWS.call(
          {
            plugin: "ftjc",
            method: "get_certificates",
            arguments: [],
          },
          (response: any) => {
            if (
              response &&
              response.certificates &&
              response.certificates.length > 0
            ) {
              const usbCertificates = response.certificates.map(
                (cert: any, index: number) => ({
                  id: `usb-token-${cert.serialNumber}-${index}`,
                  value: `usb-token-${cert.serialNumber}-${index}`,
                  label: cert.subjectCN || `USB Token ${index + 1}`,
                  disabled: false,
                  vo: {
                    type: "ftjc",
                    CN: cert.subjectCN,
                    serialNumber: cert.serialNumber,
                    validTo: cert.validTo,
                    validFrom: cert.validFrom,
                    issuerCN: cert.issuerCN,
                  },
                }),
              );
              setUsbTokensOnly(usbCertificates);
              if (usbCertificates.length > 0 && !selectedKey) {
                setSelectedKey(usbCertificates[0].id);
              }
            } else {
              // Fallback to EIMZOClient if CAPIWS doesn't return certificates
              refreshAllKeys();
            }
            setUsbTokenLoading(false);
          },
        );
      } else {
        // Fallback to EIMZOClient
        refreshAllKeys();
      }
    } catch (error) {
      console.error("USB token detection error:", error);
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

  const handleEimzoLogin = (pkcs7: string, vo: any) => {
    const loginData = { pkcs7, vo };

    dispatch(authApi.endpoints.eimzoLogin.initiate(loginData))
      .unwrap()
      .then((response: any) => {
        uiHideProgress();
        if (response?.access) {
          showToast("Muvaffaqiyatli kirish", "success");
          navigate("/main");
        } else {
          uiShowMessage("Kirish muvaffaqiyatsiz: Token topilmadi", "error");
        }
      })
      .catch((error: any) => {
        uiHideProgress();
        const errorMsg =
          error?.data?.message ||
          error?.message ||
          "Server bilan aloqa xatoligi";
        uiShowMessage(errorMsg, "error");
      });
  };

  const auth = (keyId: string, challenge: string, vo: any) => {
    window.EIMZOClient.createPkcs7(
      keyId,
      challenge,
      vo,
      null,
      (pkcs7: string, vo: any) => {
        handleEimzoLogin(pkcs7, vo);
      },
      (e: any, r: any) => {
        uiHandleError(e, r);
      },
      false,
    );
  };

  const signinPFX = () => {
    uiShowProgress();

    const itm = selectedEimzoKey || selectedKey;
    if (!itm) {
      uiShowMessage("Iltimos, sertifikatni tanlang", "error");
      uiHideProgress();
      return;
    }

    getChallenge((challenge: string) => {
      const selectedItem = eimzoKeysOnly.find((item) => item.id === itm);
      if (selectedItem) {
        window.EIMZOClient.loadKey(
          selectedItem.vo,
          (id: string) => {
            auth(id, challenge, selectedItem.vo);
          },
          uiHandleError,
        );
      } else {
        uiHideProgress();
        uiShowMessage("Sertifikat topilmadi", "error");
      }
    });
  };

  const signinToken = () => {
    if (usbTokensOnly.length === 0) {
      uiShowMessage(
        "USB-token topilmadi. Iltimos, USB-token ulang va 'Yangilash' tugmasini bosing.",
        "error",
      );
      return;
    }

    uiShowProgress();

    const itm =
      selectedKey || (usbTokensOnly.length > 0 ? usbTokensOnly[0].id : "");
    if (!itm) {
      uiHideProgress();
      uiShowMessage("USB-token sertifikati tanlanmagan", "error");
      return;
    }

    getChallenge((challenge: string) => {
      const selectedItem = usbTokensOnly.find((item) => item.id === itm);
      if (selectedItem) {
        // For USB tokens, we need to load the key first
        window.EIMZOClient.loadKey(
          selectedItem.vo,
          (id: string) => {
            // Create PKCS7 for USB token
            window.EIMZOClient.createPkcs7(
              id,
              challenge,
              selectedItem.vo,
              null,
              (pkcs7: string, vo: any) => {
                handleEimzoLogin(pkcs7, vo);
              },
              uiHandleError,
              false,
            );
          },
          uiHandleError,
        );
      } else {
        uiHideProgress();
        uiShowMessage("USB-token sertifikati topilmadi", "error");
      }
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
      showToast(msg, "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl px-8 py-10 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">
            {t("loginTitle")}
          </h2>
          <p className="text-gray-600 mt-2">Tizimga kirish</p>
        </div>

        {/* Login method selection */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4">
          <Button
            type="button"
            variant={activeTab === "login" ? "default" : "outline"}
            onClick={() => setActiveTab("login")}
            className={`h-12 text-sm font-medium transition-all duration-200 ${
              activeTab === "login"
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                : "hover:bg-gray-50"
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
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                : "hover:bg-gray-50"
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
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                : "hover:bg-gray-50"
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
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-700 font-medium">
                E-imzo sertifikati (PFX fayl) orqali kirish
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Kompyuteringizda saqlangan sertifikat
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="mt-2 text-gray-600">
                  Sertifikatlar yuklanmoqda...
                </p>
              </div>
            ) : eimzoKeysOnly.length > 0 ? (
              <>
                <div>
                  <Label htmlFor="eimzo-select" className="mb-2 block">
                    Sertifikatni tanlang:
                  </Label>
                  <select
                    id="eimzo-select"
                    value={selectedEimzoKey}
                    onChange={(e) => {
                      setSelectedEimzoKey(e.target.value);
                      setSelectedKey(e.target.value);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
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
                        {key.disabled && " (muddati tugagan)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={signinPFX}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
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
                    className="h-12 px-4"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Key className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600">
                  E-imzo sertifikatlari topilmadi
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  E-IMZO dasturini o'rnating yoki sertifikat qo'shing
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefreshKeys}
                  disabled={isLoading}
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("refreshCertificates")}
                </Button>
              </div>
            )}

            {showProgress && (
              <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                <span className="text-blue-700">Imzolanmoqda, kuting...</span>
              </div>
            )}
          </TabsContent>

          {/* ------------ USB-TOKEN LOGIN ------------- */}
          <TabsContent value="usb-token" className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium">
                USB-token (ID-card, BAIK-token) orqali kirish
              </p>
              <p className="text-xs text-green-600 mt-1">
                Fizik USB token ulanib turgan bo'lishi kerak
              </p>
            </div>

            {usbTokenLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <p className="mt-2 text-gray-600">
                  USB-tokenlar qidirilmoqda...
                </p>
              </div>
            ) : usbTokensOnly.length > 0 ? (
              <>
                <div>
                  <Label htmlFor="usb-select" className="mb-2 block">
                    USB-token tanlang:
                  </Label>
                  <select
                    id="usb-select"
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={isLoading}
                  >
                    <option value="" disabled>
                      USB-token tanlang
                    </option>
                    {usbTokensOnly.map((token) => (
                      <option
                        key={token.id}
                        value={token.id}
                        className="text-gray-800"
                      >
                        {token.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-700 font-medium">
                      {usbTokensOnly.length} ta USB-token topildi
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={signinToken}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700"
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
                    onClick={handleRefreshKeys}
                    disabled={isLoading || showProgress}
                    className="h-12 px-4"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Usb className="w-16 h-16 mx-auto text-gray-400" />
                <p className="mt-3 text-gray-700 font-medium">
                  USB-token ulanmagan
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Iltimos, USB-tokeningizni ulang
                </p>
                <div className="mt-4 space-y-2">
                  <Button
                    type="button"
                    onClick={handleRefreshKeys}
                    disabled={isLoading}
                    className="w-full h-12"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    USB-tokenni qidirish
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      window.open("https://e-imzo.uz/help", "_blank")
                    }
                    className="w-full h-12"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Yordam
                  </Button>
                </div>
              </div>
            )}

            {showProgress && (
              <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-green-600 mr-2" />
                <span className="text-green-700">Imzolanmoqda, kuting...</span>
              </div>
            )}
          </TabsContent>

          {/* ------------ SIMPLE LOGIN ------------- */}
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={checkAuthHandler} className="space-y-5">
              <div>
                <Label htmlFor="email" className="mb-2 block">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  className="h-12"
                  autoComplete="username"
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2 block">
                  {t("password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    className="h-12 pr-10"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
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
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t("enter")}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Hisobingiz yo'qmi?{" "}
                <Link
                  to="/auth/register"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ro'yxatdan o'tish
                </Link>
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500">
            E-IMZO v3.37+ talab etiladi. Agar muammo bo'lsa,{" "}
            <a
              href="https://e-imzo.uz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              e-imzo.uz
            </a>{" "}
            saytiga murojaat qiling.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
