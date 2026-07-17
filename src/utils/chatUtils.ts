import type { ChatMessage, ChatUser } from "@/services/uniqeApi";

export interface IncomingSocketPayload {
  id?: string;
  sender?: string | ChatUser;
  text?: string | IncomingSocketPayload;
  message?: string | IncomingSocketPayload;
  is_read?: boolean;
  created_at?: string;
}

export const formatChatTime = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const resolveSenderId = (
  sender: string | ChatUser | undefined
): string => {
  if (!sender) return "";
  return typeof sender === "string" ? sender : sender.id;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractTextContent = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (isRecord(value)) {
    if (typeof value.text === "string") {
      const trimmed = value.text.trim();
      return trimmed || null;
    }
    if (typeof value.message === "string") {
      const trimmed = value.message.trim();
      return trimmed || null;
    }
    if (isRecord(value.message)) {
      return extractTextContent(value.message);
    }
  }

  return null;
};

export const flattenSocketPayloads = (payload: unknown): unknown[] => {
  if (payload == null) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenSocketPayloads(item));
  }

  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.messages)) {
    return payload.messages.flatMap((item) => flattenSocketPayloads(item));
  }

  if (Array.isArray(payload.results)) {
    return payload.results.flatMap((item) => flattenSocketPayloads(item));
  }

  if (isRecord(payload.message) && extractTextContent(payload.message)) {
    return [payload.message];
  }

  if (extractTextContent(payload)) {
    return [payload];
  }

  return [];
};

export const normalizeSocketMessage = (payload: unknown): ChatMessage | null => {
  if (!isRecord(payload)) return null;

  const text =
    extractTextContent(payload.text) ??
    extractTextContent(payload.message) ??
    extractTextContent(payload);

  if (!text) return null;

  const nested =
    isRecord(payload.message) && extractTextContent(payload.message)
      ? payload.message
      : isRecord(payload.text) && extractTextContent(payload.text)
        ? payload.text
        : payload;

  const sender = (nested.sender ?? payload.sender) as string | ChatUser | undefined;
  const id =
    (typeof nested.id === "string" ? nested.id : undefined) ??
    (typeof payload.id === "string" ? payload.id : undefined);
  const createdAt =
    (typeof nested.created_at === "string" ? nested.created_at : undefined) ??
    (typeof payload.created_at === "string" ? payload.created_at : undefined);
  const isRead =
    typeof nested.is_read === "boolean"
      ? nested.is_read
      : typeof payload.is_read === "boolean"
        ? payload.is_read
        : false;

  return {
    id: id ?? crypto.randomUUID(),
    sender: sender ?? "support",
    text,
    is_read: isRead,
    created_at: createdAt ?? new Date().toISOString(),
  };
};

export const parseSocketMessages = (raw: unknown): ChatMessage[] => {
  return flattenSocketPayloads(raw)
    .map((item) => normalizeSocketMessage(item))
    .filter((item): item is ChatMessage => item !== null);
};

const normalizeMessageText = (msg: ChatMessage): string => {
  if (typeof msg.text === "string") return msg.text.trim();
  return extractTextContent(msg.text) ?? "";
};

const messageTimestamp = (value: string): number => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isPendingMessageId = (id: string) => id.startsWith("pending:");

const messageScore = (msg: ChatMessage, historyIds: Set<string>): number => {
  if (historyIds.has(msg.id)) return 3;
  if (msg.id && !isPendingMessageId(msg.id)) return 2;
  return 1;
};

const isSameMessage = (a: ChatMessage, b: ChatMessage): boolean => {
  const sameSender = resolveSenderId(a.sender) === resolveSenderId(b.sender);
  const sameText = normalizeMessageText(a) === normalizeMessageText(b);
  if (!sameSender || !sameText) return false;

  const timeA = messageTimestamp(a.created_at);
  const timeB = messageTimestamp(b.created_at);
  if (!timeA || !timeB) return true;

  return Math.abs(timeA - timeB) <= 120_000;
};

export const createPendingMessage = (
  sender: string,
  text: string
): ChatMessage => ({
  id: `pending:${crypto.randomUUID()}`,
  sender,
  text,
  is_read: false,
  created_at: new Date().toISOString(),
});

export const appendIncomingMessages = (
  prev: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] => {
  if (incoming.length === 0) return prev;

  const next = [...prev];

  incoming.forEach((msg) => {
    const pendingIndex = next.findIndex(
      (existing) =>
        isPendingMessageId(existing.id) && isSameMessage(existing, msg)
    );

    if (pendingIndex >= 0) {
      next[pendingIndex] = msg;
      return;
    }

    const duplicateIndex = next.findIndex((existing) => isSameMessage(existing, msg));
    if (duplicateIndex >= 0) {
      if (messageScore(msg, new Set()) > messageScore(next[duplicateIndex], new Set())) {
        next[duplicateIndex] = msg;
      }
      return;
    }

    next.push(msg);
  });

  return next;
};

export const mergeChatMessages = (
  history: ChatMessage[],
  live: ChatMessage[]
): ChatMessage[] => {
  const historyIds = new Set(history.map((msg) => msg.id).filter(Boolean));
  const normalized = [...history, ...live].map((msg) => ({
    ...msg,
    text: normalizeMessageText(msg),
  }));

  const merged: ChatMessage[] = [];

  normalized.forEach((msg) => {
    const duplicateIndex = merged.findIndex((existing) =>
      isSameMessage(existing, msg)
    );

    if (duplicateIndex >= 0) {
      const existing = merged[duplicateIndex];
      if (messageScore(msg, historyIds) >= messageScore(existing, historyIds)) {
        merged[duplicateIndex] = msg;
      }
      return;
    }

    merged.push(msg);
  });

  return merged.sort((a, b) => {
    const ta = messageTimestamp(a.created_at);
    const tb = messageTimestamp(b.created_at);
    if (!ta || !tb) return 0;
    return ta - tb;
  });
};

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
