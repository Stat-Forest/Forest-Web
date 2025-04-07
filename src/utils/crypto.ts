import CryptoJS from "crypto-js";

/**
 * Ma'lumotni AES yordamida shifrlab localStorage ga saqlaydi.
 * @param name - localStorage key nomi
 * @param data - saqlanadigan ma'lumot
 * @param key - shifrlash kaliti
 */
export const encryptData = (name: string, data: unknown, key: string): void => {
  if (data === undefined || data === null) {
    console.warn(`encryptData: ${name} uchun hech qanday ma'lumot topilmadi`);
    return;
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      key
    ).toString();
    localStorage.setItem(name, encrypted);
    console.log(`encryptData: ${name} muvaffaqiyatli saqlandi`);
  } catch (error) {
    console.error("encryptData: Xatolik yuz berdi", error);
  }
};

/**
 * AES yordamida localStorage'dan ma'lumotni deshifrlaydi.
 * @param name - localStorage key nomi
 * @param key - deshifrlash kaliti
 * @returns deshifrlangan obyekt yoki null
 */
export const decryptData = (name: string, key: string): unknown => {
  const encrypted = localStorage.getItem(name);

  if (!encrypted) {
    console.warn(
      `decryptData: ${name} uchun localStorage'da hech nima topilmadi`
    );
    return null;
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(
      CryptoJS.enc.Utf8
    );

    if (!decrypted) {
      throw new Error("Bo'sh yoki noto'g'ri deshifrlangan string");
    }

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("decryptData: Deshifrlashda xatolik:", error);
    localStorage.removeItem(name); // buzilgan bo‘lsa, tozalab yuboramiz
    return null;
  }
};
