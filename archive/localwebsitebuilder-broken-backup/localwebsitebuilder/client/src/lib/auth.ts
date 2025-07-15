// Simple auth configuration for the admin portal
const ADMIN_TOKEN = "pleasantcove2024admin";

export function getAuthToken(): string | null {
  // In a real app, this would come from localStorage or a cookie
  return ADMIN_TOKEN;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function setAuthToken(token: string): void {
  // In a real app, this would save to localStorage
  console.log("Auth token set");
}

export function clearAuthToken(): void {
  // In a real app, this would clear from localStorage
  console.log("Auth token cleared");
}

export function getAuthHeader(): { Authorization?: string } {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
} 