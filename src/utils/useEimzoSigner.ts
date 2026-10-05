// E-imzo (PFX yoki USB-token) bilan matnni attached PKCS#7 ga imzolash.
// Login sahifasidagi oqimning qayta ishlatiladigan ko'rinishi.
import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { EimzoKey } from "@/types/auth";
import { getEimzoApiKeys } from "@/utils/eimzoConfig";

declare global {
  interface Window {
    EIMZOClient: any;
    dates: any;
    wsErroCodeDesc?: (code: any) => string;
  }
}

export type SignMethod = "pfx" | "usb";

const EIMZO_MIN_VERSION = 3 * 100 + 37;

// E-IMZO xato matnlarini foydalanuvchiga tushunarli ko'rinishga keltiradi
export function mapEimzoError(e: any, r: any, t: TFunction): string {
  if (r) {
    const msg = String(r);
    if (msg.includes("BadPaddingException")) return t("inCorrectPass");
    if (msg.includes("Token not found") || msg.includes("No token present")) return t("usbTokenNotFound");
    if (msg.includes("PIN") || msg.includes("pin")) return t("incorrectPin");
    if (msg.includes("expired") || msg.includes("muddati")) return t("certExpired");
    return msg;
  }
  if (e) {
    const desc = typeof window.wsErroCodeDesc === "function" ? window.wsErroCodeDesc(e) : String(e);
    return `${t("eImzoConnectionErr")} : ${desc}`;
  }
  return t("unexpectedSignError");
}

export function useEimzoSigner(enabled: boolean, t: TFunction) {
  const [keys, setKeys] = useState<EimzoKey[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(() => {
    const client = window.EIMZOClient;
    setLoading(true);
    client.listAllUserKeys(
      (vo: any, i: number) => `itm-${vo.serialNumber}-${i}`,
      (id: string, vo: any) => {
        const expired = window.dates?.compare(new Date(), vo.validTo) > 0;
        return { id, value: id, label: vo.CN, disabled: !!expired, vo };
      },
      (items: any[]) => {
        const pfx = items.filter((k) => k?.vo?.type === "pfx");
        setKeys(pfx);
        setSelectedKey(pfx.find((k) => !k.disabled)?.id || pfx[0]?.id || "");
        setLoading(false);
        setReady(true);
      },
      (e: any, r: any) => {
        setLoading(false);
        setError(mapEimzoError(e, r, t));
      },
    );
  }, [t]);

  useEffect(() => {
    if (!enabled) return;
    setError(null);
    const client = window.EIMZOClient;
    if (!client) {
      setError(t("eimzoClientNotLoaded"));
      return;
    }
    client.API_KEYS = getEimzoApiKeys();
    client.checkVersion(
      (major: string, minor: string) => {
        if (parseInt(major) * 100 + parseInt(minor) < EIMZO_MIN_VERSION) {
          setError(t("eimzoUpdateRequired"));
          return;
        }
        client.installApiKeys(loadKeys, (e: any, r: any) => setError(mapEimzoError(e, r, t)));
      },
      (e: any, r: any) => setError(mapEimzoError(e, r, t)),
    );
  }, [enabled, loadKeys, t]);

  // Matnni imzolaydi va attached PKCS#7 (base64) qaytaradi
  const sign = useCallback(
    (text: string, method: SignMethod): Promise<string> =>
      new Promise((resolve, reject) => {
        const client = window.EIMZOClient;
        if (!client) return reject(new Error(t("eimzoClientNotLoaded")));

        const createPkcs7 = (keyId: string) =>
          client.createPkcs7(
            keyId,
            text,
            undefined,
            (pkcs7: string) => (pkcs7 ? resolve(pkcs7) : reject(new Error(t("pkcs7NotCreated")))),
            (e: any, r: any) => reject(new Error(mapEimzoError(e, r, t))),
            false, // attached: hujjat imzo ichida bo'ladi
          );

        if (method === "usb") {
          createPkcs7("ckc");
          return;
        }
        const item = keys.find((k) => k.id === selectedKey);
        if (!item) return reject(new Error(t("selectCertFirst")));
        client.loadKey(item.vo, createPkcs7, (e: any, r: any) => reject(new Error(mapEimzoError(e, r, t))));
      }),
    [keys, selectedKey, t],
  );

  return { keys, selectedKey, setSelectedKey, loading, ready, error, sign };
}
