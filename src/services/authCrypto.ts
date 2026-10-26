import * as Crypto from 'expo-crypto';

export async function hashEmail(email: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    email.trim().toLowerCase()
  );
}

export function pseudonymFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!domain) return 'user';
  const masked = local.length <= 2 ? '••' : `${local[0]}•••${local.slice(-1)}`;
  return `${masked}@${domain}`;
}
