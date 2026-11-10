const calls: number[] = [];

// This only limits one warm instance, not all Vercel instances.
export async function takeProviderCall(): Promise<boolean> {
  const now = Date.now();
  while (calls.length && calls[0] <= now - 86_400_000) calls.shift();
  if (
    calls.length >= 40 ||
    calls.filter((time) => time > now - 60_000).length >= 5
  ) {
    return false;
  }
  calls.push(now);
  return true;
}
