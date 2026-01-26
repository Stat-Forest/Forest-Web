import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Usb,
  Key,
  LogIn,
  Shield,
  CheckCircle,
} from "lucide-react";

// ============ TYPES ============
interface EimzoKey {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
  vo: {
    type?: string;
    CN: string;
    serialNumber: string;
    validTo: string;
    validFrom: string;
    issuerCN?: string;
    disk?: string;
    path?: string;
    name?: string;
    alias?: string;
  };
}

// interface Credentials {
//   email: string;
//   password: string;
// }

// ============ GLOBAL DECLARATIONS ============
declare global {
  interface Window {
    EIMZOClient: any;
    CAPIWS: any;
  }
}

// ============ E-IMZO CONFIG ============
const getEimzoApiKeys = () => [
  "localhost",
  "127.0.0.1",
  "null",
  // Production uchun domeningizni qo'shing:
  // "yourdomain.uz",
  // "app.yourdomain.uz"
];

// ============ E-IMZO WRAPPER ============
const createEimzoWrapper = () => {
  const checkClient = (methodName: string) => {
    if (!window.EIMZOClient) {
      throw new Error(`E-IMZO klienti yuklanmagan (${methodName})`);
    }
    if (typeof window.EIMZOClient[methodName] !== "function") {
      throw new Error(`E-IMZO metodi topilmadi: ${methodName}`);
    }
  };

  return {
    checkVersion: (
      success: (major: number, minor: number) => void,
      error: (e: any, r: any) => void,
    ) => {
      try {
        checkClient("checkVersion");
        window.EIMZOClient.checkVersion(success, error);
      } catch (err: any) {
        error(err, err.message);
      }
    },

    installApiKeys: (success: () => void, error: (e: any, r: any) => void) => {
      try {
        checkClient("installApiKeys");
        window.EIMZOClient.installApiKeys(success, error);
      } catch (err: any) {
        error(err, err.message);
      }
    },

    listAllUserKeys: (
      idCallback: (o: any, i: number) => string,
      createItemCallback: (itemId: string, v: any) => any,
      successCallback: (items: any[], firstId: string | null) => void,
      errorCallback: (e: any, r: any) => void,
    ) => {
      try {
        checkClient("listAllUserKeys");
        window.EIMZOClient.listAllUserKeys(
          idCallback,
          createItemCallback,
          successCallback,
          errorCallback,
        );
      } catch (err: any) {
        errorCallback(err, err.message);
      }
    },

    loadKey: (
      vo: any,
      success: (id: string) => void,
      error: (e: any, r: any) => void,
    ) => {
      try {
        checkClient("loadKey");
        window.EIMZOClient.loadKey(vo, success, error);
      } catch (err: any) {
        error(err, err.message);
      }
    },

    createPkcs7: (
      keyId: string,
      data: string,
      vo: any,
      password: string | null,
      success: (pkcs7: string, vo: any) => void,
      error: (e: any, r: any) => void,
    ) => {
      try {
        checkClient("createPkcs7");
        window.EIMZOClient.createPkcs7(
          keyId,
          data,
          vo,
          password,
          success,
          error,
          false,
        );
      } catch (err: any) {
        error(err, err.message);
      }
    },

    // USB-token detection via CAPIWS
    getCertificatesViaCapiws: (
      success: (certs: any[]) => void,
      error: (e: any, r: any) => void,
    ) => {
      try {
        if (!window.CAPIWS) {
          throw new Error("CAPIWS yuklanmagan");
        }

        window.CAPIWS.call(
          {
            plugin: "ftjc",
            method: "list_certificates",
            arguments: [],
          },
          (event: any, data: any) => {
            if (event) {
              error(event, "CAPIWS xatolik");
              return;
            }

            if (data && data.certificates && Array.isArray(data.certificates)) {
              success(data.certificates);
            } else {
              success([]);
            }
          },
          (err: any) => {
            error(err, "CAPIWS so'rov xatosi");
          },
        );
      } catch (err: any) {
        error(err, err.message);
      }
    },
  };
};

// ============ TOAST NOTIFICATIONS ============
const ToastContainer = ({
  messages,
}: {
  messages: Array<{ id: string; message: string; type: string }>;
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[300px] p-4 rounded-lg shadow-lg border animate-in slide-in-from-top-5 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : toast.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && <CheckCircle className="w-5 h-5" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============ MAIN COMPONENT ============
function Login() {
  // State management
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "eimzo" | "usb-token">(
    "login",
  );
  const [toastMessages, setToastMessages] = useState<
    Array<{ id: string; message: string; type: string }>
  >([]);

  // E-IMZO state
  const [isEimzoLoading, setIsEimzoLoading] = useState(true);
  const [isEimzoReady, setIsEimzoReady] = useState(false);
  const [eimzoCerts, setEimzoCerts] = useState<EimzoKey[]>([]);
  const [selectedCert, setSelectedCert] = useState("");
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);

  // USB-token state
  const [usbTokens, setUsbTokens] = useState<EimzoKey[]>([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [isUsbLoading, setIsUsbLoading] = useState(false);

  // Login state
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Refs
  const eimzoClient = useRef(createEimzoWrapper());
  const initAttempts = useRef(0);
  const maxInitAttempts = 5;

  // Toast helper
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "error") => {
      const id = Math.random().toString(36);
      setToastMessages((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToastMessages((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  // Error formatter
  const formatError = useCallback((e: any, r: any): string => {
    if (r && typeof r === "string") {
      if (r.includes("BadPaddingException")) return "Parol noto'g'ri";
      if (r.includes("Token not found") || r.includes("No token"))
        return "USB-token topilmadi";
      if (r.includes("PIN") || r.includes("pin")) return "PIN-kod noto'g'ri";
      if (r.includes("expired")) return "Sertifikatning muddati tugagan";
      if (r.includes("CAPI") || r.includes("WebSocket"))
        return "E-IMZO bilan aloqa xatosi";
      return r;
    }
    if (e && e.message) return e.message;
    return "Noma'lum xatolik";
  }, []);

  // Initialize E-IMZO
  const initializeEimzo = useCallback(() => {
    if (!window.EIMZOClient) {
      if (initAttempts.current < maxInitAttempts) {
        initAttempts.current++;
        console.log(
          `E-IMZO yuklash urinishi ${initAttempts.current}/${maxInitAttempts}`,
        );
        setTimeout(initializeEimzo, 1000);
        return;
      }
      setError(
        "E-IMZO klienti yuklanmadi. Sahifani yangilang yoki dasturni o'rnating.",
      );
      setIsEimzoLoading(false);
      return;
    }

    console.log("E-IMZO klienti topildi, tekshirilmoqda...");

    // Set API keys
    const apiKeys = getEimzoApiKeys();
    window.EIMZOClient.API_KEYS = apiKeys;

    // Check version
    eimzoClient.current.checkVersion(
      (major: number, minor: number) => {
        console.log(`E-IMZO versiyasi: ${major}.${minor}`);

        const REQUIRED_MAJOR = 3;
        const REQUIRED_MINOR = 37;
        const currentVersion = major * 100 + minor;
        const requiredVersion = REQUIRED_MAJOR * 100 + REQUIRED_MINOR;

        if (currentVersion < requiredVersion) {
          setError(
            `E-IMZO dasturini yangilang (hozirgi: ${major}.${minor}, kerak: ${REQUIRED_MAJOR}.${REQUIRED_MINOR}+)`,
          );
          setIsEimzoLoading(false);
          return;
        }

        // Install API keys
        eimzoClient.current.installApiKeys(
          () => {
            console.log("API kalitlar o'rnatildi");
            setIsEimzoReady(true);
            setIsEimzoLoading(false);
            loadEimzoCertificates();
            showToast("E-IMZO tayyor", "success");
          },
          (e: any, r: any) => {
            const msg = formatError(e, r);
            setError(msg);
            setIsEimzoLoading(false);
            showToast(msg, "error");
          },
        );
      },
      (e: any, r: any) => {
        const msg = formatError(e, r);
        setError(msg);
        setIsEimzoLoading(false);
        showToast(msg, "error");
      },
    );
  }, [formatError, showToast]);

  // Load E-IMZO certificates (PFX)
  const loadEimzoCertificates = useCallback(() => {
    if (!isEimzoReady) return;

    setIsEimzoLoading(true);
    eimzoClient.current.listAllUserKeys(
      (o: any, i: number) => `pfx-${o.serialNumber || i}`,
      (itemId: string, vo: any) => {
        const now = new Date();
        const validTo = new Date(vo.validTo);
        const expired = validTo < now;

        return {
          id: itemId,
          value: itemId,
          label: expired ? `${vo.CN} (muddati tugagan)` : vo.CN,
          disabled: expired,
          vo: vo,
        };
      },
      (items: any[]) => {
        console.log(`${items.length} ta sertifikat topildi`);

        // Filter only PFX types
        const pfxCerts = items.filter(
          (item) => !item.vo.type || item.vo.type === "pfx",
        );

        setEimzoCerts(pfxCerts);
        setIsEimzoLoading(false);

        if (pfxCerts.length > 0) {
          const firstValid = pfxCerts.find((c) => !c.disabled);
          if (firstValid) setSelectedCert(firstValid.id);
        }
      },
      (e: any, r: any) => {
        const msg = formatError(e, r);
        setError(msg);
        setIsEimzoLoading(false);
        showToast(msg, "error");
      },
    );
  }, [isEimzoReady, formatError, showToast]);

  // Load USB tokens (FTJC)
  const loadUsbTokens = useCallback(() => {
    if (!isEimzoReady) {
      showToast("E-IMZO tayyor emas", "error");
      return;
    }

    setIsUsbLoading(true);
    setError(null);

    eimzoClient.current.getCertificatesViaCapiws(
      (certificates: any[]) => {
        console.log(`${certificates.length} ta USB-token topildi`);

        if (certificates.length === 0) {
          setUsbTokens([]);
          setIsUsbLoading(false);
          return;
        }

        const tokens: EimzoKey[] = certificates.map(
          (cert: any, index: number) => {
            const now = new Date();
            const validTo = cert.validTo ? new Date(cert.validTo) : now;
            const expired = validTo < now;

            return {
              id: `usb-${cert.serialNumber || cert.serial || index}`,
              value: `usb-${cert.serialNumber || cert.serial || index}`,
              label: expired
                ? `${cert.subjectCN || cert.CN || `Token ${index + 1}`} (muddati tugagan)`
                : cert.subjectCN || cert.CN || `USB Token ${index + 1}`,
              disabled: expired,
              vo: {
                type: "ftjc",
                CN: cert.subjectCN || cert.CN,
                serialNumber: cert.serialNumber || cert.serial,
                validTo: cert.validTo,
                validFrom: cert.validFrom,
                issuerCN: cert.issuerCN,
                disk: cert.disk,
                path: cert.path,
                name: cert.name,
                alias: cert.alias,
              },
            };
          },
        );

        setUsbTokens(tokens);
        setIsUsbLoading(false);

        if (tokens.length > 0) {
          const firstValid = tokens.find((t) => !t.disabled);
          if (firstValid) setSelectedToken(firstValid.id);
        }

        showToast(`${tokens.length} ta USB-token topildi`, "success");
      },
      (e: any, r: any) => {
        console.error("USB-token yuklashda xato:", e, r);

        // Fallback: try listing all keys
        eimzoClient.current.listAllUserKeys(
          (o: any, i: number) => `token-${o.serialNumber || i}`,
          (itemId: string, vo: any) => {
            const now = new Date();
            const validTo = new Date(vo.validTo);
            const expired = validTo < now;

            return {
              id: itemId,
              value: itemId,
              label: expired ? `${vo.CN} (muddati tugagan)` : vo.CN,
              disabled: expired,
              vo: vo,
            };
          },
          (items: any[]) => {
            const tokenItems = items.filter(
              (item) =>
                item.vo.type === "ftjc" ||
                item.vo.type === "usb" ||
                item.vo.type === "ftjctoken",
            );

            console.log(`Fallback: ${tokenItems.length} ta token topildi`);
            setUsbTokens(tokenItems);
            setIsUsbLoading(false);

            if (tokenItems.length > 0) {
              const firstValid = tokenItems.find((t) => !t.disabled);
              if (firstValid) setSelectedToken(firstValid.id);
            }
          },
          (e2: any, r2: any) => {
            const msg = formatError(e2, r2);
            setError(msg);
            setIsUsbLoading(false);
            showToast(msg, "error");
          },
        );
      },
    );
  }, [isEimzoReady, formatError, showToast]);

  // Generate challenge for signing
  const generateChallenge = useCallback(() => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }, []);

  // Handle E-IMZO login (mock - replace with your API)
  const handleEimzoLogin = useCallback(
    async (pkcs7: string, vo: any) => {
      try {
        console.log("E-IMZO login:", {
          pkcs7: pkcs7.substring(0, 50) + "...",
          vo,
        });

        // MOCK API CALL - Replace with your actual API
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Simulate success
        showToast("Muvaffaqiyatli kirish", "success");
        setLoginSuccess(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          // window.location.href = "/main"; // Replace with your navigation
          console.log("Redirecting to /main...");
        }, 2000);
      } catch (error: any) {
        const msg = error?.message || "Server xatosi";
        showToast(msg, "error");
        setError(msg);
      } finally {
        setIsSigningInProgress(false);
      }
    },
    [showToast],
  );

  // Sign with E-IMZO (PFX)
  const signWithEimzo = useCallback(() => {
    if (!selectedCert) {
      showToast("Sertifikatni tanlang", "error");
      return;
    }

    const cert = eimzoCerts.find((c) => c.id === selectedCert);
    if (!cert) {
      showToast("Sertifikat topilmadi", "error");
      return;
    }

    setIsSigningInProgress(true);
    setError(null);

    const challenge = generateChallenge();

    eimzoClient.current.loadKey(
      cert.vo,
      (keyId: string) => {
        eimzoClient.current.createPkcs7(
          keyId,
          challenge,
          cert.vo,
          null,
          (pkcs7: string, vo: any) => {
            handleEimzoLogin(pkcs7, vo);
          },
          (e: any, r: any) => {
            const msg = formatError(e, r);
            setError(msg);
            setIsSigningInProgress(false);
            showToast(msg, "error");
          },
        );
      },
      (e: any, r: any) => {
        const msg = formatError(e, r);
        setError(msg);
        setIsSigningInProgress(false);
        showToast(msg, "error");
      },
    );
  }, [
    selectedCert,
    eimzoCerts,
    generateChallenge,
    handleEimzoLogin,
    formatError,
    showToast,
  ]);

  // Sign with USB token
  const signWithUsbToken = useCallback(() => {
    if (usbTokens.length === 0) {
      showToast("USB-token topilmadi", "error");
      return;
    }

    if (!selectedToken) {
      showToast("USB-token tanlang", "error");
      return;
    }

    const token = usbTokens.find((t) => t.id === selectedToken);
    if (!token) {
      showToast("Token topilmadi", "error");
      return;
    }

    setIsSigningInProgress(true);
    setError(null);

    const challenge = generateChallenge();

    eimzoClient.current.loadKey(
      token.vo,
      (keyId: string) => {
        eimzoClient.current.createPkcs7(
          keyId,
          challenge,
          token.vo,
          null,
          (pkcs7: string, vo: any) => {
            handleEimzoLogin(pkcs7, vo);
          },
          (e: any, r: any) => {
            const msg = formatError(e, r);
            setError(msg);
            setIsSigningInProgress(false);
            showToast(msg, "error");
          },
        );
      },
      (e: any, r: any) => {
        const msg = formatError(e, r);
        setError(msg);
        setIsSigningInProgress(false);
        showToast(msg, "error");
      },
    );
  }, [
    selectedToken,
    usbTokens,
    generateChallenge,
    handleEimzoLogin,
    formatError,
    showToast,
  ]);

  // Regular login
  const handleRegularLogin = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setIsLoggingIn(true);

      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      if (!email || !password) {
        setError("Email va parol kiriting");
        setIsLoggingIn(false);
        return;
      }

      try {
        console.log("Regular login:", { email, password: "***" });

        // MOCK API CALL - Replace with your actual API
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Simulate success
        showToast("Muvaffaqiyatli kirish", "success");
        setLoginSuccess(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          // window.location.href = "/main"; // Replace with your navigation
          console.log("Redirecting to /main...");
        }, 2000);
      } catch (error: any) {
        const msg = error?.message || "Kirish xatosi";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setIsLoggingIn(false);
      }
    },
    [showToast],
  );

  // Initialize on mount
  useEffect(() => {
    initializeEimzo();
  }, [initializeEimzo]);

  // Load USB tokens when tab changes
  useEffect(() => {
    if (activeTab === "usb-token" && isEimzoReady && usbTokens.length === 0) {
      loadUsbTokens();
    }
  }, [activeTab, isEimzoReady, usbTokens.length, loadUsbTokens]);

  // Render loading state
  if (isEimzoLoading && initAttempts.current < maxInitAttempts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              E-IMZO yuklanmoqda
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Urinish: {initAttempts.current}/{maxInitAttempts}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Sahifani yangilash
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Muvaffaqiyatli!</h3>
          <p className="text-gray-600">Tizimga kirilmoqda...</p>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer messages={toastMessages} />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800">Tizimga kirish</h2>
            <p className="text-gray-600 mt-2">Xavfsiz autentifikatsiya</p>
          </div>

          {/* Tab selector */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={activeTab === "login" ? "default" : "outline"}
              onClick={() => setActiveTab("login")}
              className="h-11"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Kirish
            </Button>
            <Button
              type="button"
              variant={activeTab === "eimzo" ? "default" : "outline"}
              onClick={() => setActiveTab("eimzo")}
              className="h-11"
            >
              <Key className="w-4 h-4 mr-2" />
              E-imzo
            </Button>
            <Button
              type="button"
              variant={activeTab === "usb-token" ? "default" : "outline"}
              onClick={() => setActiveTab("usb-token")}
              className="h-11"
            >
              <Usb className="w-4 h-4 mr-2" />
              USB
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            {/* Regular Login */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleRegularLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    className="h-11 mt-2"
                    disabled={isLoggingIn}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Parol</Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      required
                      className="h-11 pr-10"
                      disabled={isLoggingIn}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      disabled={isLoggingIn}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        showToast("Parolni tiklash funksiyasi", "info")
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Parolni unutdingizmi?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kirilmoqda...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Kirish
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Hisobingiz yo'qmi?{" "}
                  <button
                    onClick={() =>
                      showToast("Ro'yxatdan o'tish funksiyasi", "info")
                    }
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Ro'yxatdan o'tish
                  </button>
                </p>
              </div>
            </TabsContent>

            {/* E-IMZO Login */}
            <TabsContent value="eimzo" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  E-imzo sertifikati (PFX)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Kompyuterda saqlangan sertifikat
                </p>
              </div>

              {isEimzoLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-gray-600 mt-2">Yuklanmoqda...</p>
                </div>
              ) : eimzoCerts.length > 0 ? (
                <>
                  <div>
                    <Label htmlFor="eimzo-cert">Sertifikat:</Label>
                    <select
                      id="eimzo-cert"
                      value={selectedCert}
                      onChange={(e) => setSelectedCert(e.target.value)}
                      className="w-full h-11 mt-2 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSigningInProgress}
                    >
                      <option value="">Tanlang</option>
                      {eimzoCerts.map((cert) => (
                        <option
                          key={cert.id}
                          value={cert.id}
                          disabled={cert.disabled}
                        >
                          {cert.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={signWithEimzo}
                      disabled={!selectedCert || isSigningInProgress}
                      className="flex-1 h-11"
                    >
                      {isSigningInProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Imzolanmoqda...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Kirish
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadEimzoCertificates}
                      disabled={isEimzoLoading}
                      className="h-11 px-4"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg">
                  <Key className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600 mt-2">Sertifikat topilmadi</p>
                  <Button
                    variant="outline"
                    onClick={loadEimzoCertificates}
                    className="mt-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Yangilash
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* USB Token Login */}
            <TabsContent value="usb-token" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">USB-token</p>
                <p className="text-xs text-green-600 mt-1">
                  ID-card yoki BAIK-token
                </p>
              </div>

              {isUsbLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
                  <p className="text-gray-600 mt-2">
                    USB-token qidirilmoqda...
                  </p>
                </div>
              ) : usbTokens.length > 0 ? (
                <>
                  <div>
                    <Label htmlFor="usb-token">Token:</Label>
                    <select
                      id="usb-token"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full h-11 mt-2 px-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isSigningInProgress}
                    >
                      <option value="">Tanlang</option>
                      {usbTokens.map((token) => (
                        <option
                          key={token.id}
                          value={token.id}
                          disabled={token.disabled}
                        >
                          {token.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-green-700 text-sm font-medium">
                        {usbTokens.length} ta token topildi
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={signWithUsbToken}
                      disabled={!selectedToken || isSigningInProgress}
                      className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                    >
                      {isSigningInProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Imzolanmoqda...
                        </>
                      ) : (
                        <>
                          <Usb className="w-4 h-4 mr-2" />
                          Kirish
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadUsbTokens}
                      disabled={isUsbLoading}
                      className="h-11 px-4"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg">
                  <Usb className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-medium mt-3">
                    USB-token ulanmagan
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Token ulang va qayta urinib ko'ring
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={loadUsbTokens}
                      disabled={isUsbLoading}
                      className="w-full h-11 bg-green-600 hover:bg-green-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Qidirish
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open("https://e-imzo.uz/help", "_blank")
                      }
                      className="w-full h-11"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Yordam
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              E-IMZO v3.37+ talab etiladi.{" "}
              <a
                href="https://e-imzo.uz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                e-imzo.uz
              </a>
            </p>
            {!isEimzoReady && initAttempts.current >= maxInitAttempts && (
              <p className="text-xs text-yellow-600 mt-2">
                E-IMZO yuklanmadi. E-IMZO dasturini o'rnating yoki sahifani
                yangilang.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
