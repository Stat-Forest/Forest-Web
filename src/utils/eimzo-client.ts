// 📁 src/utils/eimzo-client.ts

export { }; // Global kengaytmalar

declare global {
    interface Date {
        yyyymmdd(): string;
        ddmmyyyy(): string;
    }
    interface String {
        splitKeep(splitter: string | RegExp, ahead: boolean): string[];
    }
    interface Window {
        CAPIWS: any;
        Base64: {
            encode: (input: string) => string;
        };
    }
}

Date.prototype.yyyymmdd = function () {
    const yyyy = this.getFullYear().toString();
    const mm = (this.getMonth() + 1).toString().padStart(2, "0");
    const dd = this.getDate().toString().padStart(2, "0");
    return yyyy + mm + dd;
};

Date.prototype.ddmmyyyy = function () {
    const yyyy = this.getFullYear().toString();
    const mm = (this.getMonth() + 1).toString().padStart(2, "0");
    const dd = this.getDate().toString().padStart(2, "0");
    return `${dd}.${mm}.${yyyy}`;
};

String.prototype.splitKeep = function (splitter, ahead) {
    const result: string[] = [];
    const self = this.toString();
    if (splitter !== "") {
        function getSubst(value: string): string {
            return value.replace(/./g, value[0] === "0" ? "1" : "0");
        }

        const matches: { value: string; index: number }[] = [];
        const replaced = self.replace(splitter, (match, offset) => {
            matches.push({ value: match, index: offset });
            return getSubst(match);
        });

        console.warn(replaced)

        let lastIndex = 0;
        for (const m of matches) {
            const nextIndex = ahead ? m.index : m.index + m.value.length;
            if (nextIndex !== lastIndex) {
                result.push(self.substring(lastIndex, nextIndex));
                lastIndex = nextIndex;
            }
        }
        if (lastIndex < self.length) {
            result.push(self.substring(lastIndex));
        }
    } else {
        result.push(self);
    }
    return result;
};

export interface KeyItem {
    disk?: string;
    path?: string;
    name?: string;
    alias?: string;
    cardUID?: string;
    statusInfo?: string;
    ownerName?: string;
    info?: string;
    serialNumber: string;
    validFrom: Date;
    validTo: Date;
    CN: string;
    TIN: string;
    UID: string;
    PINFL?: string;
    O: string;
    T: string;
    type: "pfx" | "ftjc";
}

export interface EIMZOClientType {
    NEW_API: boolean;
    API_KEYS: string[];
    checkVersion(success: (major: number, minor: number) => void, fail: (err: any, reason: string | null) => void): void;
    installApiKeys(success: () => void, fail: (err: any, reason: string | null) => void): void;
    listAllUserKeys(
        itemIdGen: (vo: KeyItem, rec: string) => string,
        itemUiGen: (id: string, vo: KeyItem) => any,
        success: (items: any[], firstId: string | null) => void,
        fail: (err: any, reason: string | null) => void
    ): void;
    loadKey(itemObject: KeyItem, success: (id: string) => void, fail: (err: any, reason: string | null) => void): void;
    changeKeyPassword(itemObject: KeyItem, success: () => void, fail: (err: any, reason: string | null) => void): void;
    createPkcs7(
        id: string,
        data: string,
        timestamper: ((signatureHex: string, success: (tst: string) => void, fail: (e: any, r: string | null) => void) => void) | undefined,
        success: (pkcs7: string) => void,
        fail: (err: any, reason: string | null) => void
    ): void;
    _findPfxs2(): void;
    _findTokens2(): void;
    _getX500Val(s: string, f: string): string;
}

export const EIMZOClient: EIMZOClientType = {
    NEW_API: false,
    API_KEYS: [
        "localhost",
        "<YOUR_TEST_API_KEY>",
        "127.0.0.1",
        "<YOUR_TEST_API_KEY>",
    ],

    checkVersion(success, fail) {
        window.CAPIWS.apiversion(
            (major: number, minor: number) => success(major, minor),
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    installApiKeys(success, fail) {
        window.CAPIWS.installApiKeys(
            this.API_KEYS,
            () => success(),
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    listAllUserKeys(itemIdGen, itemUiGen, success, fail) {
        window.CAPIWS.list_all_user_keys(
            (items: any[]) => {
                const itemObjects = items.map((item, index) => {
                    const key: KeyItem = { ...item };
                    const id = itemIdGen(key, String(index));
                    return itemUiGen(id, key);
                });
                success(itemObjects, itemObjects.length > 0 ? String(0) : null);
            },
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    loadKey(itemObject, success, fail) {
        window.CAPIWS.load_key(
            itemObject,
            (id: string) => success(id),
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    changeKeyPassword(itemObject, success, fail) {
        window.CAPIWS.change_key_password(
            itemObject,
            () => success(),
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    createPkcs7(id, data, timestamper, success, fail) {
        window.CAPIWS.create_pkcs7(
            id,
            data,
            timestamper,
            (pkcs7: string) => success(pkcs7),
            (err: any, reason: string | null) => fail(err, reason)
        );
    },

    _findPfxs2() {
        window.CAPIWS.findPfxs(
            () => { },
            (err: any, reason: string | null) => console.error("_findPfxs2 error", err, reason)
        );
    },

    _findTokens2() {
        window.CAPIWS.findTokens(
            () => { },
            (err: any, reason: string | null) => console.error("_findTokens2 error", err, reason)
        );
    },

    _getX500Val(s: string, f: string): string {
        const res = s.splitKeep(/,[A-Z]+=/g, true);
        for (const part of res) {
            const idx = part.search((res.indexOf(part) > 0 ? "," : "") + f + "=");
            if (idx !== -1) return part.slice(idx + f.length + 1 + (res.indexOf(part) > 0 ? 1 : 0));
        }
        return "";
    },
};
