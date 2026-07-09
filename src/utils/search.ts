export type SearchValue = string | number | null | undefined;

type SearchOptions = {
  ignoreDiacritics?: boolean;
  startsWith?: boolean;
};

export const normalizeSearchText = (
  value: SearchValue,
  { ignoreDiacritics = true }: Pick<SearchOptions, "ignoreDiacritics"> = {}
): string => {
  const normalized = String(value ?? "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (!ignoreDiacritics) {
    return normalized;
  }

  return normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const matchesSearch = (
  value: SearchValue,
  query: SearchValue,
  { ignoreDiacritics = true, startsWith = false }: SearchOptions = {}
): boolean => {
  const normalizedQuery = normalizeSearchText(query, { ignoreDiacritics });

  if (!normalizedQuery) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value, { ignoreDiacritics });

  if (startsWith) {
    return normalizedValue.startsWith(normalizedQuery);
  }

  return normalizedValue.includes(normalizedQuery);
};

export const filterBySearch = <T>(
  items: T[] | null | undefined,
  query: SearchValue,
  getSearchText: (item: T) => SearchValue,
  options?: SearchOptions
): T[] => {
  if (!items?.length) {
    return [];
  }

  return items.filter((item) => matchesSearch(getSearchText(item), query, options));
};

export const filterBySearchPriority = <T>(
  items: T[] | null | undefined,
  query: SearchValue,
  getSearchText: (item: T) => SearchValue,
  options?: Omit<SearchOptions, "startsWith">
): T[] => {
  if (!items?.length) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query, {
    ignoreDiacritics: options?.ignoreDiacritics,
  });

  if (!normalizedQuery) {
    return items;
  }

  const startsWithMatches: T[] = [];
  const includesMatches: T[] = [];

  for (const item of items) {
    const normalizedValue = normalizeSearchText(getSearchText(item), {
      ignoreDiacritics: options?.ignoreDiacritics,
    });

    if (normalizedValue.startsWith(normalizedQuery)) {
      startsWithMatches.push(item);
      continue;
    }

    if (normalizedValue.includes(normalizedQuery)) {
      includesMatches.push(item);
    }
  }

  return [...startsWithMatches, ...includesMatches];
};