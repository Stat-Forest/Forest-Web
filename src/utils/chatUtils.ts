import type {
  ChatConversation,
  ChatMessage,
  ChatUser,
} from "@/services/uniqeApi";

/** Backend WS cheklovi: bitta xabar maksimal uzunligi. */
export const MAX_MESSAGE_LENGTH = 5000;

/** WebSocket ulanishi rad etilganda serverdan keladigan maxsus close kodlari. */
export const WS_CLOSE_UNAUTHORIZED = 4401;
export const WS_CLOSE_NOT_FOUND = 4404;
export const WS_CLOSE_FORBIDDEN = 4403;

/** Bu kodlar bilan yopilganda qayta ulanishga urinish mantiqsiz. */
const FATAL_CLOSE_CODES = new Set([
  WS_CLOSE_UNAUTHORIZED,
  WS_CLOSE_NOT_FOUND,
  WS_CLOSE_FORBIDDEN,
]);

export const isFatalCloseCode = (code: number): boolean =>
  FATAL_CLOSE_CODES.has(code);

export const describeCloseCode = (code: number, isRu = false): string => {
  switch (code) {
    case WS_CLOSE_UNAUTHORIZED:
      return isRu
        ? "Сессия истекла. Войдите заново."
        : "Sessiya tugagan. Qaytadan tizimga kiring.";
    case WS_CLOSE_NOT_FOUND:
      return isRu ? "Чат не найден." : "Chat topilmadi.";
    case WS_CLOSE_FORBIDDEN:
      return isRu
        ? "У вас нет доступа к этому чату."
        : "Bu chatga ruxsatingiz yo'q.";
    default:
      return isRu ? "Соединение прервано." : "Ulanish uzildi.";
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/* -------------------------------------------------------------------------- */
/*  Sana/vaqt                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Backend "DD.MM.YYYY HH:mm" formatida ham, ISO formatida ham qaytarishi
 * mumkin — ikkalasini ham tushunadigan parser (guide 2.5 dagi eslatma).
 */
export const parseChatDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const dotted = value
    .trim()
    .match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ ,T]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);

  if (dotted) {
    const [, dd, mm, yyyy, hh = "0", min = "0", ss = "0"] = dotted;
    return new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss)
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const chatTimestamp = (value?: string | null): number => {
  const parsed = parseChatDate(value);
  return parsed ? parsed.getTime() : 0;
};

export const formatChatTime = (value?: string | null): string => {
  const parsed = parseChatDate(value);
  if (!parsed) return value || "";
  return parsed.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatChatDateTime = (value?: string | null): string => {
  const parsed = parseChatDate(value);
  if (!parsed) return value || "";
  return parsed.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* -------------------------------------------------------------------------- */
/*  Foydalanuvchi / xabar yordamchi funksiyalari                               */
/* -------------------------------------------------------------------------- */

export const resolveSenderId = (
  sender: string | ChatUser | undefined | null
): string => {
  if (!sender) return "";
  return typeof sender === "string" ? String(sender) : String(sender.id ?? "");
};

export const formatUserName = (
  user?: ChatUser | null,
  fallback = "Foydalanuvchi"
): string => {
  if (!user) return fallback;
  const fullName =
    user.full_name?.trim() ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return fullName || user.email || fallback;
};

const PENDING_PREFIX = "pending:";

export const isPendingMessage = (message: ChatMessage): boolean =>
  typeof message.id === "string" && message.id.startsWith(PENDING_PREFIX);

export const createPendingMessage = (
  senderId: string,
  text: string
): ChatMessage => ({
  id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
  sender: senderId,
  text,
  is_read: false,
  created_at: new Date().toISOString(),
});

/* -------------------------------------------------------------------------- */
/*  WebSocket hodisalarini o'qish                                              */
/* -------------------------------------------------------------------------- */

export type ChatSocketEvent =
  | { type: "chat_message"; message: ChatMessage }
  | { type: "conversation_assigned"; conversation: ChatConversation }
  | { type: "conversation_closed"; conversation: ChatConversation }
  | { type: "chat_error"; message: string };

const normalizeMessage = (raw: unknown): ChatMessage | null => {
  if (!isRecord(raw)) return null;
  const text = typeof raw.text === "string" ? raw.text : "";
  if (!text.trim()) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    sender: (raw.sender as string | ChatUser) ?? "",
    text,
    is_read: typeof raw.is_read === "boolean" ? raw.is_read : false,
    created_at:
      typeof raw.created_at === "string"
        ? raw.created_at
        : new Date().toISOString(),
  };
};

const normalizeConversation = (raw: unknown): ChatConversation | null => {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;
  return raw as unknown as ChatConversation;
};

/**
 * Server hodisalari `type` maydoni bo'yicha tarmoqlanadi (guide 3.3).
 * Noma'lum yoki buzuq payload — `null`, ulanish uzilmaydi.
 */
export const parseSocketEvent = (raw: unknown): ChatSocketEvent | null => {
  if (!isRecord(raw)) return null;

  const type = typeof raw.type === "string" ? raw.type : "";

  switch (type) {
    case "chat_message": {
      const message = normalizeMessage(raw.message);
      return message ? { type: "chat_message", message } : null;
    }
    case "conversation_assigned": {
      const conversation = normalizeConversation(raw.conversation);
      return conversation ? { type: "conversation_assigned", conversation } : null;
    }
    case "conversation_closed": {
      const conversation = normalizeConversation(raw.conversation);
      return conversation ? { type: "conversation_closed", conversation } : null;
    }
    case "chat.error":
    case "chat_error":
    case "error": {
      const message =
        typeof raw.message === "string" && raw.message.trim()
          ? raw.message
          : "Xabarni yuborib bo'lmadi.";
      return { type: "chat_error", message };
    }
    default: {
      // Eski protokol bilan moslik: `type` siz kelgan xabar obyekti.
      const message = normalizeMessage(raw.message) ?? normalizeMessage(raw);
      return message ? { type: "chat_message", message } : null;
    }
  }
};

/* -------------------------------------------------------------------------- */
/*  Xabarlar ro'yxatini birlashtirish                                          */
/* -------------------------------------------------------------------------- */

const sortByTime = (messages: ChatMessage[]): ChatMessage[] =>
  [...messages].sort((a, b) => {
    const ta = chatTimestamp(a.created_at);
    const tb = chatTimestamp(b.created_at);
    if (!ta || !tb || ta === tb) return 0;
    return ta - tb;
  });

/**
 * Server har bir xabarni guruhdagi HAMMAGA yuboradi — jumladan yozgan
 * odamning o'ziga ham. Shuning uchun asosiy dedupe kaliti — `message.id`.
 * Optimistik (pending) xabar esa echo kelganda o'sha xabar bilan almashtiriladi.
 */
export const upsertMessage = (
  list: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] => {
  const byId = list.findIndex((item) => item.id === incoming.id);
  if (byId >= 0) {
    const next = [...list];
    next[byId] = incoming;
    return next;
  }

  const incomingSender = resolveSenderId(incoming.sender);
  const pendingIndex = list.findIndex(
    (item) =>
      isPendingMessage(item) &&
      item.text.trim() === incoming.text.trim() &&
      (!incomingSender || resolveSenderId(item.sender) === incomingSender)
  );

  if (pendingIndex >= 0) {
    const next = [...list];
    next[pendingIndex] = incoming;
    return next;
  }

  return [...list, incoming];
};

/** Tarix (REST) + jonli (WS) xabarlarni id bo'yicha birlashtiradi. */
export const mergeChatMessages = (
  history: ChatMessage[],
  live: ChatMessage[]
): ChatMessage[] => {
  let merged: ChatMessage[] = [...history];
  live.forEach((message) => {
    merged = upsertMessage(merged, message);
  });

  // Tarixda allaqachon bor xabarning optimistik nusxasini olib tashlaymiz.
  const realTexts = new Set(
    merged
      .filter((item) => !isPendingMessage(item))
      .map((item) => `${resolveSenderId(item.sender)}|${item.text.trim()}`)
  );

  const cleaned = merged.filter(
    (item) =>
      !isPendingMessage(item) ||
      !realTexts.has(`${resolveSenderId(item.sender)}|${item.text.trim()}`)
  );

  return sortByTime(cleaned);
};

/* -------------------------------------------------------------------------- */
/*  Ruxsatlar (guide 4-bo'lim: ruxsatlar matritsasi)                           */
/* -------------------------------------------------------------------------- */

export const isSupportRole = (role?: string | null): boolean =>
  role === "support_admin" || role === "super_admin";

export const isSuperAdminRole = (role?: string | null): boolean =>
  role === "super_admin";

/**
 * Yozish huquqi: chat ochiq (`new`/`taken`) bo'lishi shart, va yozuvchi
 * yo chat egasi, yo AYNAN shu chatga biriktirilgan admin bo'lishi kerak.
 * Biriktirilmagan support_admin — faqat o'qiy oladi.
 */
export const canSendMessage = (
  conversation: ChatConversation | null | undefined,
  userId: string
): boolean => {
  if (!conversation || conversation.status === "closed") return false;

  const ownerId = resolveSenderId(conversation.user);
  if (ownerId && ownerId === String(userId)) return true;

  const assignedId = resolveSenderId(conversation.assigned_to);
  return (
    conversation.status === "taken" && !!assignedId && assignedId === String(userId)
  );
};

/** Chatni yopa oladimi: biriktirilgan admin yoki super_admin (istalganini). */
export const canCloseConversation = (
  conversation: ChatConversation | null | undefined,
  userId: string,
  role?: string | null
): boolean => {
  if (!conversation || conversation.status === "closed") return false;
  if (isSuperAdminRole(role)) return true;
  const assignedId = resolveSenderId(conversation.assigned_to);
  return conversation.status === "taken" && assignedId === String(userId);
};

/** Userning o'z chatini bekor qilishi — faqat `new` holatida. */
export const canCancelConversation = (
  conversation: ChatConversation | null | undefined,
  userId: string
): boolean => {
  if (!conversation || conversation.status !== "new") return false;
  return resolveSenderId(conversation.user) === String(userId);
};

/* -------------------------------------------------------------------------- */
/*  REST xatolari (guide 2.2) — string matching emas, status kodi bo'yicha     */
/* -------------------------------------------------------------------------- */

export const getErrorStatus = (error: unknown): number | null => {
  if (isRecord(error) && typeof error.status === "number") return error.status;
  return null;
};

export const describeChatError = (
  error: unknown,
  isRu = false,
  fallback?: string
): string => {
  switch (getErrorStatus(error)) {
    case 403:
      return isRu
        ? "У вас нет прав на это действие."
        : "Bu amal uchun ruxsatingiz yo'q.";
    case 404:
      return isRu ? "Чат не найден." : "Chat topilmadi.";
    case 409:
      return isRu
        ? "Действие невозможно: чат уже занят, закрыт или у вас есть активный чат."
        : "Amal bajarilmadi: chat allaqachon band, yopilgan yoki sizda faol chat bor.";
    case 429:
      return isRu
        ? "Дневной лимит чатов исчерпан. Попробуйте завтра."
        : "Kunlik chat limiti tugadi. Ertaga urinib ko'ring.";
    default:
      return (
        fallback ||
        (isRu ? "Произошла ошибка. Попробуйте еще раз." : "Xatolik yuz berdi. Qaytadan urinib ko'ring.")
      );
  }
};

/* -------------------------------------------------------------------------- */
/*  WebSocket manzili                                                          */
/* -------------------------------------------------------------------------- */

export const buildChatSocketUrl = (
  conversationId: string,
  token: string
): string => {
  const rawWsBase = String(import.meta.env.VITE_WS_URL || "").trim();
  const envWsBase = (/^wss?:\/\//i.test(rawWsBase) ? rawWsBase : `ws://${rawWsBase}`)
    .replace(/\/$/, "")
    .replace(/\/api\/v1$/, "")
    .replace(/\/api$/, "");
  const wsBase = import.meta.env.DEV
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
    : envWsBase;

  return `${wsBase}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;
};
