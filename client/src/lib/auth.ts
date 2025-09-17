import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  level: string;
  avatar?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

// Cambio crítico: usar localStorage para persistir la sesión durante redirecciones de Stripe
let currentUser: AuthUser | null = null;

const STORAGE_KEY = 'passport2fluency_user';

// Cargar usuario desde localStorage al iniciar
const loadUserFromStorage = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

// Guardar usuario en localStorage
const saveUserToStorage = (user: AuthUser | null) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

export const getCurrentUser = (): AuthUser | null => {
  if (!currentUser) {
    currentUser = loadUserFromStorage();
  }
  return currentUser;
};

export const setCurrentUser = (user: AuthUser | null) => {
  currentUser = user;
  saveUserToStorage(user);
};

export const login = async (data: LoginData): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/login", data);
  const result = await response.json();
  
  if (result.user) {
    setCurrentUser(result.user);
    return result.user;
  }
  
  throw new Error("Login failed");
};

export const register = async (data: RegisterData): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/register", data);
  const result = await response.json();
  
  if (result.user) {
    setCurrentUser(result.user);
    return result.user;
  }
  
  throw new Error("Registration failed");
};

export const logout = () => {
  setCurrentUser(null);
};

export const isAuthenticated = (): boolean => {
  // Importante: hidratar desde localStorage antes de verificar
  return getCurrentUser() !== null;
};
