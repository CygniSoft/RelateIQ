const API_BASE = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`;

export interface ExtractedCard {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
}

export interface ScanCardResult {
  success: boolean;
  data?: ExtractedCard;
  error?: string;
}

/**
 * Sends a business-card image to the API for AI extraction.
 * `image` may be a raw base64 string or a full data URL.
 * `token` is the Clerk session token; the endpoint requires sign-in.
 */
export async function scanCard(image: string, token?: string): Promise<ScanCardResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/scan-card`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageBase64: image }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error:
          (data as { error?: string; detail?: string }).error ??
          (data as { detail?: string }).detail ??
          `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as ExtractedCard;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
