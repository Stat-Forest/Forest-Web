export const base_url = import.meta.env.VITE_API_URL;

export const prepareHeaders = (
  headers: Headers,
  { getState }: { getState: () => unknown }
) => {
  const state = getState() as any;
  const token = state?.auth?.token;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
};
