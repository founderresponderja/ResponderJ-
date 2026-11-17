/**
 * Builds standard auth headers for app API calls.
 * - Always sets Content-Type: application/json.
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
  if (options.getToken) {
    const clerkToken = await options.getToken();
    if (clerkToken) headers['Authorization'] = `Bearer ${clerkToken}`;
  }
  return headers;
}
