/**
 * E-IMZO API Keys Configuration
 * API keys .env fayldan olinadi va xavfsiz tarzda ishlatiladi
 */

/**
 * E-IMZO API keys ni .env dan o'qib qaytaradi
 * Agar .env da bo'lmasa, fallback qiymatlar qaytariladi (development uchun)
 */

//  ./utils/eimzoConfig.ts
export const getEimzoApiKeys = (): string[] => {
  try {
    const envKeys = import.meta.env.VITE_EIMZO_API_KEYS;

    if (envKeys) {
      // JSON string bo'lsa parse qilamiz
      if (typeof envKeys === "string") {
        try {
          const parsed = JSON.parse(envKeys);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // Agar parse qilib bo'lmasa, to'g'ridan-to'g'ri qaytaramiz
          return envKeys.split(",").map((k) => k.trim());
        }
      }

      // Agar allaqachon array bo'lsa
      if (Array.isArray(envKeys)) {
        return envKeys;
      }
    }
  } catch (error) {
    console.warn("E-IMZO API keys .env dan o'qib bo'lmadi:", error);
  }
  
  // Fallback - development uchun (agar .env da bo'lmasa)
  // Production'da bu xato bo'ladi, shuning uchun .env ni to'ldirish majburiy
  if (import.meta.env.DEV) {
    return [
      "localhost",
      "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
      "127.0.0.1",
      "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
      "null",
      "E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D",
      "stat-urmon.uz",
      "HEX_API_KEY_FOR_stat-urmon.uz",
    ];
  }

  // Production'da xato
  console.error("E-IMZO API keys .env faylda topilmadi!");
  return [];
};
