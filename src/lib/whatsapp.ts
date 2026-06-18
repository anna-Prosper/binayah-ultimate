import { USERS_DEFAULT } from "@/lib/data";

const PUBLIC_WHATSAPP_USER_NUMBERS: Record<string, string> = {
  prajeesh: "917510608234",
  ahsan: "971505281668",
  shyam: "919727015745",
};

type WhatsAppSendResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

function apiBaseUrl(): string | null {
  return (process.env.WHATSAPP_API_BASE_URL || process.env.WHATSAPP_BASE_URL || "").replace(/\/+$/, "") || null;
}

function apiKey(): string | null {
  return process.env.WHATSAPP_API_KEY || null;
}

function normalizeWhatsAppRecipient(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/@g\.us$/i.test(trimmed) || /@s\.whatsapp\.net$/i.test(trimmed)) {
    return trimmed.replace(/[^\dA-Za-z@._-]/g, "");
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits || undefined;
}

export function isWhatsAppGroupRecipient(value: string): boolean {
  return /@g\.us$/i.test(value.trim());
}

function userNumberMap(): Record<string, string> {
  const mapped: Record<string, string> = { ...PUBLIC_WHATSAPP_USER_NUMBERS };

  const raw = process.env.WHATSAPP_USER_NUMBERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value !== "string" || !value.trim()) continue;
        const recipient = normalizeWhatsAppRecipient(value);
        if (recipient) mapped[key] = recipient;
      }
    } catch {
      console.warn("[whatsapp] WHATSAPP_USER_NUMBERS is not valid JSON");
    }
  }

  for (const user of USERS_DEFAULT) {
    const envKey = `WHATSAPP_USER_${user.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const value = process.env[envKey];
    const recipient = value ? normalizeWhatsAppRecipient(value) : undefined;
    if (recipient) mapped[user.id] = recipient;
  }
  return mapped;
}

export function getConfiguredWhatsAppRecipientForUser(fixedUserId: string): string | undefined {
  return userNumberMap()[fixedUserId];
}

export function getWhatsAppRecipientForUser(fixedUserId: string): string | undefined {
  const recipient = getConfiguredWhatsAppRecipientForUser(fixedUserId);
  if (!recipient || isWhatsAppGroupRecipient(recipient)) return undefined;
  return recipient;
}

export async function sendWhatsAppText(to: string, text: string, timeoutMs = 30000): Promise<WhatsAppSendResult> {
  const baseUrl = apiBaseUrl();
  const key = apiKey();
  if (!baseUrl || !key) return { ok: false, error: "WhatsApp API is not configured" };
  if (!to || !text.trim()) return { ok: false, error: "missing recipient or text" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({ to, text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json() as { error?: string; detail?: string };
        detail = data.detail || data.error || "";
      } catch {
        detail = await res.text().catch(() => "");
      }
      return { ok: false, status: res.status, error: detail || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}
