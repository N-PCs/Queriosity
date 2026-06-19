const RAW_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = RAW_URL.replace(/\/+$/, "");

console.log("[API] Backend URL:", API_URL);

function getToken(): string | null {
  try {
    return localStorage.getItem("queriosity_token");
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem("queriosity_token", token);
    else localStorage.removeItem("queriosity_token");
  } catch {}
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const customKey =
      typeof window !== "undefined"
        ? localStorage.getItem("queriosity_custom_gemini_key")
        : null;
    if (customKey) {
      headers["x-gemini-key"] = customKey;
    }
  } catch {}

  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(
      `Could not reach the server at ${API_URL}. Make sure the backend is running and the URL is correct. (${err.message})`
    );
  }

  let body: any;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    const text = await res.text();
    body = { error: text || `Server returned ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return body;
}

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ user: any; session: any }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ user: any; session: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
  },
  chat: {
    query: (question: string) =>
      request<{ answer: string; sources: any[] }>("/chat/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
    history: () =>
      request<{ queries: any[] }>("/chat/history", { method: "GET" }),
  },
};
