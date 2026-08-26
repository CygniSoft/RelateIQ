import { logger } from "./logger";

const CLERK_API_URL = "https://api.clerk.com/v1/redirect_urls";
const MOBILE_REDIRECT_URL = "relateiq://oauth-redirect";

type ClerkRedirectUrl = {
  url?: string;
};

async function clerkRequest(
  secretKey: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(CLERK_API_URL, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function ensureClerkMobileRedirectUrl(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    logger.error("CLERK_SECRET_KEY is missing; cannot configure mobile OAuth");
    return;
  }

  try {
    const listResponse = await clerkRequest(secretKey);
    if (!listResponse.ok) {
      throw new Error(
        `Clerk redirect URL lookup failed with HTTP ${listResponse.status}`,
      );
    }

    const redirectUrls = (await listResponse.json()) as ClerkRedirectUrl[];
    if (!redirectUrls.some(({ url }) => url === MOBILE_REDIRECT_URL)) {
      const createResponse = await clerkRequest(secretKey, {
        method: "POST",
        body: JSON.stringify({ url: MOBILE_REDIRECT_URL }),
      });

      if (!createResponse.ok) {
        throw new Error(
          `Clerk redirect URL creation failed with HTTP ${createResponse.status}`,
        );
      }
    }

    const verifyResponse = await clerkRequest(secretKey);
    if (!verifyResponse.ok) {
      throw new Error(
        `Clerk redirect URL verification failed with HTTP ${verifyResponse.status}`,
      );
    }

    const verifiedUrls = (await verifyResponse.json()) as ClerkRedirectUrl[];
    if (!verifiedUrls.some(({ url }) => url === MOBILE_REDIRECT_URL)) {
      throw new Error("Clerk mobile redirect URL was not persisted");
    }

    logger.info(
      { redirectUrl: MOBILE_REDIRECT_URL },
      "Clerk mobile redirect URL ready",
    );
  } catch (err) {
    logger.error({ err }, "Failed to configure Clerk mobile redirect URL");
  }
}