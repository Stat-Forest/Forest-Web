import { decryptData } from "@/utils/crypto";

export const base_url = import.meta.env.VITE_API_URL;

export const prepareHeaders = (headers: Headers) => {
  const token = decryptData("token", "token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
};
