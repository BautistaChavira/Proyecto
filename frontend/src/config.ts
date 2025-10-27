// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://proyecto-backend-jsv7.onrender.com/api';

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
      credentials: 'include', // Necesario para cookies de sesión
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    // Si la respuesta no es ok, intentamos parsear el mensaje de error
    if (!response.ok) {
      let errorMessage = `Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Si no podemos parsear el error, usamos el mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Si no es JSON, podría ser texto plano
      data = await response.text();
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('La petición ha excedido el tiempo de espera');
      }
      throw error;
    }
    throw new Error('Error desconocido en la petición');
  } finally {
    clearTimeout(id);
  }
}