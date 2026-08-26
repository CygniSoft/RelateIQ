const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64Ascii(value: string): string {
  let encoded = "";

  for (let index = 0; index < value.length; index += 3) {
    const first = value.charCodeAt(index);
    const hasSecond = index + 1 < value.length;
    const hasThird = index + 2 < value.length;
    const second = hasSecond ? value.charCodeAt(index + 1) : 0;
    const third = hasThird ? value.charCodeAt(index + 2) : 0;

    encoded += BASE64_ALPHABET[first >> 2];
    encoded += BASE64_ALPHABET[((first & 3) << 4) | (second >> 4)];
    if (hasSecond) {
      encoded += BASE64_ALPHABET[((second & 15) << 2) | (third >> 6)];
    }
    if (hasThird) {
      encoded += BASE64_ALPHABET[third & 63];
    }
  }

  return encoded;
}

export function getClerkConfig(
  domain: string | undefined,
  configuredPublishableKey: string | undefined,
  configuredProxyUrl: string | undefined,
): { publishableKey: string; proxyUrl: string | undefined } {
  const normalizedDomain = domain?.toLowerCase().replace(/:\d+$/, "");

  if (normalizedDomain?.endsWith(".replit.app")) {
    return {
      publishableKey: `pk_live_${encodeBase64Ascii(`clerk.${normalizedDomain}$`)}`,
      proxyUrl: `https://${normalizedDomain}/api/__clerk`,
    };
  }

  if (!configuredPublishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required");
  }

  return {
    publishableKey: configuredPublishableKey,
    proxyUrl: configuredProxyUrl || undefined,
  };
}