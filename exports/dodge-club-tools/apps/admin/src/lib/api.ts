/**
 * Core API fetch wrapper that automatically includes the auth token
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("dc_admin_token");
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (token) {
    headers.set("x-auth-token", token);
  }
  
  const res = await fetch(endpoint, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    let errorMessage = `API Error: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      // Ignored
    }
    throw new Error(errorMessage);
  }
  
  // Return null for 204 No Content
  if (res.status === 204) return null as T;
  
  return res.json();
}
