const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`;

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  replyTo?: string;
  token?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { token, ...payload } = params;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/send-email`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (data as any).detail ?? (data as any).error ?? `HTTP ${res.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export interface SendMeetingInviteParams {
  uid?: string;
  to: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  reminderMinutes?: number;
  token?: string;
}

export type SendMeetingInviteResult =
  | { success: true; deliveryStatus: "sent" | "pending" | "unknown" }
  | { success: false; error: string };

export async function sendMeetingInvite(
  params: SendMeetingInviteParams,
): Promise<SendMeetingInviteResult> {
  const { token, ...payload } = params;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/meeting-invite`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    const deliveryStatus = (data as { deliveryStatus?: unknown }).deliveryStatus;
    if (
      (res.ok || res.status === 409) &&
      (deliveryStatus === "sent" ||
        deliveryStatus === "pending" ||
        deliveryStatus === "unknown")
    ) {
      return { success: true, deliveryStatus };
    }

    if (!res.ok) {
      return {
        success: false,
        error: (data as any).detail ?? (data as any).error ?? `HTTP ${res.status}`,
      };
    }

    return { success: true, deliveryStatus: "sent" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
