export interface StripeSettingsCandidate {
  secret?: string;
  secret_key?: string;
  webhook_secret?: string;
}

export function selectStripeSettingsForMode<T extends StripeSettingsCandidate>(
  candidates: T[],
  requireLiveMode: boolean,
): T | undefined {
  const expectedPrefix = requireLiveMode ? "sk_live_" : "sk_test_";
  return candidates.find((candidate) => {
    const key = candidate.secret ?? candidate.secret_key ?? "";
    return key.startsWith(expectedPrefix);
  });
}