// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_URLS = {
  // Catalog endpoints
  categories: `${API_BASE_URL}/categories`,
  breeds: `${API_BASE_URL}/breeds`,
  
  // Auth endpoints
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  recover: `${API_BASE_URL}/auth/recover`,
  
  // User endpoints
  profile: `${API_BASE_URL}/user/profile`,
  
  // MisMascotas endpoints
  pets: `${API_BASE_URL}/pets`,
  
  // Curiosidades endpoint
  curiosidades: `${API_BASE_URL}/curiosidades`,
} as const;

// API request timeout (ms)
export const API_TIMEOUT = 5000;

// Utility for API requests with timeout
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } finally {
    clearTimeout(id);
  }
}