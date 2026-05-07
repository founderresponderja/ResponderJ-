export async function getCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf-token');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.csrfToken ?? null;
  } catch (e) {
    console.warn('Could not fetch CSRF token', e);
    return null;
  }
}

/**
 * Builds standard auth headers for app API calls.
 * - Always sets Content-Type: application/json.
 * - Adds x-csrf-token if available (state-changing methods).
 * - Adds Authorization: Bearer {jwt} if a token is provided.
 *
 * Pass getToken from useAuth() (clerk) as the second arg.
 */
export async function buildAuthHeaders(
  options: { getToken?: () => Promise<string | null> } = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const csrfToken = await getCsrfToken();
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  if (options.getToken) {
    const clerkToken = await options.getToken();
    if (clerkToken) headers['Authorization'] = `Bearer ${clerkToken}`;
  }
  return headers;
}
